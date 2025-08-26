// ====================================================
// SCRIPT DE DIAGNÓSTICO - SEED
// Archivo: debug-seed.js (crear en la raíz del proyecto)
// ====================================================

import { executeQuery } from './server/config/database.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const EXCEL_FILE = 'Gastos Socios Symbiot.xlsx';

async function diagnosticar() {
    console.log('🔍 INICIANDO DIAGNÓSTICO...\n');
    
    try {
        console.log('✅ Paso 1: Conexión a base de datos');
        
        // Test 1: Verificar conexión a base de datos
        console.log('🔗 Probando conexión...');
        const [result] = await executeQuery('SELECT 1 as test');
        console.log('✅ Conexión exitosa:', result);
        
        // Test 2: Verificar archivo Excel
        console.log('\n📁 Paso 2: Verificando archivo Excel');
        const excelPath = path.join(process.cwd(), EXCEL_FILE);
        console.log('📍 Ruta:', excelPath);
        
        if (!fs.existsSync(excelPath)) {
            throw new Error(`❌ Archivo no encontrado: ${EXCEL_FILE}`);
        }
        console.log('✅ Archivo existe');
        
        // Test 3: Leer Excel
        console.log('\n📊 Paso 3: Leyendo Excel...');
        const buffer = fs.readFileSync(excelPath);
        console.log('✅ Buffer leído, tamaño:', buffer.length, 'bytes');
        
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        console.log('✅ Excel parseado');
        console.log('📋 Hojas encontradas:', workbook.SheetNames);
        
        // Test 4: Verificar hoja específica
        console.log('\n🎸 Paso 4: Verificando hoja Ingresos RockstarSkull...');
        const worksheet = workbook.Sheets['Ingresos RockstarSkull'];
        
        if (!worksheet) {
            throw new Error('❌ Hoja "Ingresos RockstarSkull" no encontrada');
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('✅ Datos extraídos');
        console.log('📊 Total filas:', data.length);
        console.log('📋 Headers:', data[0]);
        
        // Test 5: Verificar algunos datos de muestra
        console.log('\n👤 Paso 5: Verificando datos de alumnos...');
        for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
            if (data[i] && data[i][1]) {
                console.log(`   Alumno ${i}: ${data[i][1]} (${data[i][3]})`);
            }
        }
        
        // Test 6: Probar inserción simple
        console.log('\n💾 Paso 6: Probando inserción de prueba...');
        
        // Limpiar cualquier dato de prueba anterior
        await executeQuery("DELETE FROM transacciones WHERE concepto = 'TEST_DIAGNOSTICO'");
        
        // Insertar registro de prueba
        await executeQuery(`
            INSERT INTO transacciones 
            (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['2025-01-01', 'TEST_DIAGNOSTICO', 'Hugo Vázquez', 1, 'Efectivo', 1, 1500, 'I', 3]);
        
        console.log('✅ Inserción de prueba exitosa');
        
        // Verificar inserción
        const [testRecord] = await executeQuery("SELECT * FROM transacciones WHERE concepto = 'TEST_DIAGNOSTICO'");
        console.log('✅ Registro verificado:', {
            id: testRecord.id,
            concepto: testRecord.concepto,
            socio: testRecord.socio
        });
        
        // Limpiar registro de prueba
        await executeQuery("DELETE FROM transacciones WHERE concepto = 'TEST_DIAGNOSTICO'");
        console.log('✅ Registro de prueba eliminado');
        
        console.log('\n🎉 DIAGNÓSTICO COMPLETADO EXITOSAMENTE');
        console.log('✅ La base de datos y el Excel están funcionando correctamente');
        console.log('\n💡 El problema puede estar en la lógica del script principal');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERROR EN DIAGNÓSTICO:', error.message);
        console.error('📍 Stack trace:', error.stack);
        process.exit(1);
    }
}

// Ejecutar diagnóstico
diagnosticar();