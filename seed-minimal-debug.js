// ====================================================
// SCRIPT MINIMAL DE DEBUG - IDENTIFICAR PROBLEMA
// Archivo: seed-minimal-debug.js (crear en la raíz)
// ====================================================

import { executeQuery } from './server/config/database.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const EXCEL_FILE = 'Gastos Socios Symbiot.xlsx';

async function debugMinimal() {
    console.log('🔍 DEBUG MINIMAL - PASO A PASO\n');
    
    let paso = 1;
    
    try {
        console.log(`${paso++}. 🔗 Testing database connection...`);
        const [test] = await executeQuery('SELECT 1 as test');
        console.log('✅ Database OK:', test);

        console.log(`${paso++}. 📁 Checking Excel file...`);
        const excelPath = path.join(process.cwd(), EXCEL_FILE);
        if (!fs.existsSync(excelPath)) {
            throw new Error('Excel file not found');
        }
        console.log('✅ Excel file exists');

        console.log(`${paso++}. 📊 Reading Excel...`);
        const buffer = fs.readFileSync(excelPath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        console.log('✅ Excel loaded, sheets:', workbook.SheetNames.length);

        console.log(`${paso++}. 🧪 Testing simple insert...`);
        
        // Delete test record first
        await executeQuery("DELETE FROM transacciones WHERE concepto = 'TEST_MINIMAL'");
        console.log('✅ Cleaned test records');

        // Simple insert
        await executeQuery(`
            INSERT INTO transacciones 
            (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['2025-01-01', 'TEST_MINIMAL', 'Test User', 1, 'Efectivo', 1, 100.00, 'I', 1]);
        
        console.log('✅ Test insert successful');

        console.log(`${paso++}. 🔍 Verifying insert...`);
        const [testRecord] = await executeQuery("SELECT * FROM transacciones WHERE concepto = 'TEST_MINIMAL'");
        console.log('✅ Record verified:', testRecord.id);

        console.log(`${paso++}. 🧹 Cleaning up...`);
        await executeQuery("DELETE FROM transacciones WHERE concepto = 'TEST_MINIMAL'");
        console.log('✅ Cleanup done');

        console.log(`${paso++}. 📊 Testing Excel data processing...`);
        const worksheet = workbook.Sheets['Ingresos RockstarSkull'];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('✅ Excel data processed, rows:', data.length);

        console.log(`${paso++}. 🎯 Testing batch insert (5 records)...`);
        
        let insertCount = 0;
        for (let i = 1; i <= 5 && i < data.length; i++) {
            const alumno = data[i];
            if (!alumno || !alumno[1]) continue;

            await executeQuery(`
                INSERT INTO transacciones 
                (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                '2025-01-01', 
                `TEST_BATCH_${i} - ${alumno[1]}`, 
                alumno[3] || 'Test Maestro', 
                1, 
                'Efectivo', 
                1, 
                1500, 
                'I', 
                1
            ]);
            insertCount++;
            console.log(`   ✅ Inserted record ${i}: ${alumno[1]}`);
        }

        console.log(`✅ Batch insert completed: ${insertCount} records`);

        console.log(`${paso++}. 🧹 Final cleanup...`);
        await executeQuery("DELETE FROM transacciones WHERE concepto LIKE 'TEST_BATCH_%'");
        console.log('✅ All test records cleaned');

        console.log('\n🎉 DEBUG COMPLETED SUCCESSFULLY!');
        console.log('💡 The database operations are working correctly');
        console.log('🤔 The issue might be in the main script logic or connection handling');
        
        // Force exit with success
        setTimeout(() => {
            console.log('🚪 Forcing exit...');
            process.exit(0);
        }, 1000);

    } catch (error) {
        console.error(`\n❌ ERROR AT STEP ${paso - 1}:`, error.message);
        console.error('📍 Stack:', error.stack);
        
        // Force exit with error
        setTimeout(() => {
            console.log('🚪 Forcing exit with error...');
            process.exit(1);
        }, 1000);
    }
}

// Add timeout to prevent hanging
setTimeout(() => {
    console.log('\n⏰ TIMEOUT - Script took too long');
    console.log('🚪 Force exiting...');
    process.exit(1);
}, 30000); // 30 second timeout

console.log('🚀 Starting minimal debug...');
debugMinimal();