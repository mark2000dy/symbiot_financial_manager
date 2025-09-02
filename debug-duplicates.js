// ====================================================
// DIAGNÓSTICO DE DUPLICADOS - DEBUG SCRIPT
// Archivo: debug-duplicates.js
// ====================================================

import { executeQuery } from './server/config/database.js';

async function diagnosticarDuplicados() {
    console.log('🔍 DIAGNÓSTICO DE DUPLICADOS EN BASE DE DATOS\n');
    
    try {
        // 1. Contar registros actuales
        console.log('📊 CONTEO ACTUAL DE REGISTROS:');
        console.log('─'.repeat(50));
        
        const tablas = ['empresas', 'usuarios', 'maestros', 'staff', 'transacciones'];
        for (const tabla of tablas) {
            const [count] = await executeQuery(`SELECT COUNT(*) as total FROM ${tabla}`);
            console.log(`${tabla.padEnd(15)}: ${count.total} registros`);
        }
        
        // 2. Analizar transacciones por empresa y tipo
        console.log('\n💰 DISTRIBUCIÓN DE TRANSACCIONES:');
        console.log('─'.repeat(50));
        
        const distribucion = await executeQuery(`
            SELECT 
                empresa_id,
                tipo,
                COUNT(*) as cantidad,
                SUM(total) as monto_total
            FROM transacciones 
            GROUP BY empresa_id, tipo 
            ORDER BY empresa_id, tipo
        `);
        
        distribucion.forEach(row => {
            const empresa = row.empresa_id === 1 ? 'Rockstar Skull' : 'Symbiot Tech';
            const tipoDesc = row.tipo === 'I' ? 'Ingresos' : 'Gastos';
            console.log(`${empresa} - ${tipoDesc}: ${row.cantidad} transacciones, $${row.monto_total.toLocaleString()}`);
        });
        
        // 3. Buscar duplicados exactos
        console.log('\n🔍 BÚSQUEDA DE DUPLICADOS EXACTOS:');
        console.log('─'.repeat(50));
        
        const duplicados = await executeQuery(`
            SELECT 
                fecha, concepto, socio, empresa_id, tipo, precio_unitario, COUNT(*) as duplicates
            FROM transacciones 
            GROUP BY fecha, concepto, socio, empresa_id, tipo, precio_unitario
            HAVING COUNT(*) > 1
            ORDER BY duplicates DESC
            LIMIT 10
        `);
        
        if (duplicados.length > 0) {
            console.log(`❌ ENCONTRADOS ${duplicados.length} GRUPOS DE DUPLICADOS:`);
            duplicados.forEach((dup, i) => {
                console.log(`${i+1}. "${dup.concepto.substring(0,50)}..." - ${dup.duplicates} copias`);
            });
        } else {
            console.log('✅ No se encontraron duplicados exactos');
        }
        
        // 4. Verificar transacciones por fecha para detectar patrones
        console.log('\n📅 TRANSACCIONES POR AÑO:');
        console.log('─'.repeat(50));
        
        const porAnio = await executeQuery(`
            SELECT 
                YEAR(fecha) as año,
                COUNT(*) as transacciones,
                SUM(CASE WHEN tipo='I' THEN total ELSE 0 END) as ingresos,
                SUM(CASE WHEN tipo='G' THEN total ELSE 0 END) as gastos
            FROM transacciones 
            GROUP BY YEAR(fecha)
            ORDER BY año
        `);
        
        porAnio.forEach(row => {
            console.log(`${row.año}: ${row.transacciones} transacciones, Ingresos: $${row.ingresos.toLocaleString()}, Gastos: $${row.gastos.toLocaleString()}`);
        });
        
        // 5. Verificar IDs de transacciones para detectar reinserción
        console.log('\n🔢 ANÁLISIS DE IDs:');
        console.log('─'.repeat(50));
        
        const [minMax] = await executeQuery(`
            SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as total_count
            FROM transacciones
        `);
        
        console.log(`ID mínimo: ${minMax.min_id}, ID máximo: ${minMax.max_id}, Total registros: ${minMax.total_count}`);
        
        if (minMax.max_id > minMax.total_count) {
            console.log('⚠️ POSIBLE PROBLEMA: Hay gaps en los IDs, sugiere reinserciones');
        }
        
        // 6. Comparar con balances esperados
        console.log('\n💵 TOTALES ACTUALES vs ESPERADOS:');
        console.log('─'.repeat(50));
        
        const totales = await executeQuery(`
            SELECT 
                CASE WHEN empresa_id = 1 THEN 'Rockstar Skull' ELSE 'Symbiot Technologies' END as empresa,
                SUM(CASE WHEN tipo='I' THEN total ELSE 0 END) as ingresos,
                SUM(CASE WHEN tipo='G' THEN total ELSE 0 END) as gastos,
                SUM(CASE WHEN tipo='I' THEN total ELSE -total END) as balance
            FROM transacciones 
            GROUP BY empresa_id
        `);
        
        console.log('ACTUAL:');
        totales.forEach(row => {
            console.log(`${row.empresa}: Ingresos $${row.ingresos.toLocaleString()}, Gastos $${row.gastos.toLocaleString()}, Balance $${row.balance.toLocaleString()}`);
        });
        
        console.log('\nESPERADO (según usuario):');
        console.log('Rockstar Skull: Ingresos $1,335,485.86, Gastos $787,838.88, Balance $547,646.98');
        console.log('Symbiot Technologies: Ingresos $181,803.92, Gastos $156,575.00, Balance $25,228.92');
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error.message);
    }
}

diagnosticarDuplicados().then(() => {
    console.log('\n🔍 Diagnóstico completado');
    process.exit(0);
});