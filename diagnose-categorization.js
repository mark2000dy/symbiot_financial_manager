// ====================================================
// DIAGNÓSTICO DE CATEGORIZACIÓN INCORRECTA
// Archivo: diagnose-categorization.js
// ====================================================

import { executeQuery } from './server/config/database.js';

async function diagnosticarCategorizacion() {
    console.log('🔍 DIAGNÓSTICO ESPECÍFICO DE CATEGORIZACIÓN DE EMPRESAS\n');
    
    try {
        // 1. Analizar transacciones sospechosas de Symbiot con conceptos de academia
        console.log('🎸 TRANSACCIONES SOSPECHOSAS - Symbiot con conceptos de academia:');
        console.log('─'.repeat(70));
        
        const sospechosasSymbiot = await executeQuery(`
            SELECT id, fecha, concepto, socio, precio_unitario, tipo
            FROM transacciones 
            WHERE empresa_id = 2 
            AND (concepto LIKE '%mensualidad%' 
                 OR concepto LIKE '%guitarra%' 
                 OR concepto LIKE '%piano%' 
                 OR concepto LIKE '%bateria%' 
                 OR concepto LIKE '%clase%'
                 OR concepto LIKE '%teclado%')
            ORDER BY precio_unitario DESC
            LIMIT 10
        `);
        
        console.log(`❌ ENCONTRADAS ${sospechosasSymbiot.length} transacciones de academia asignadas a Symbiot:`);
        sospechosasSymbiot.forEach((t, i) => {
            console.log(`${i+1}. ID:${t.id} | $${t.precio_unitario} | ${t.concepto.substring(0,50)}... | ${t.socio}`);
        });
        
        // 2. Analizar las transacciones más caras de Symbiot
        console.log('\n💰 TRANSACCIONES MÁS CARAS DE SYMBIOT:');
        console.log('─'.repeat(50));
        
        const carasSymbiot = await executeQuery(`
            SELECT id, fecha, concepto, socio, precio_unitario, tipo
            FROM transacciones 
            WHERE empresa_id = 2 
            ORDER BY precio_unitario DESC
            LIMIT 10
        `);
        
        carasSymbiot.forEach((t, i) => {
            console.log(`${i+1}. $${t.precio_unitario.toLocaleString()} - ${t.concepto.substring(0,50)}...`);
        });
        
        // 3. Comparar patrones de precios entre empresas
        console.log('\n📊 PATRONES DE PRECIOS POR EMPRESA:');
        console.log('─'.repeat(50));
        
        const patronesPrecios = await executeQuery(`
            SELECT 
                empresa_id,
                tipo,
                COUNT(*) as transacciones,
                MIN(precio_unitario) as precio_min,
                AVG(precio_unitario) as precio_promedio,
                MAX(precio_unitario) as precio_max
            FROM transacciones 
            GROUP BY empresa_id, tipo
            ORDER BY empresa_id, tipo
        `);
        
        patronesPrecios.forEach(p => {
            const empresa = p.empresa_id === 1 ? 'Rockstar' : 'Symbiot';
            const tipo = p.tipo === 'I' ? 'Ingresos' : 'Gastos';
            const promedio = p.precio_promedio ? parseFloat(p.precio_promedio).toFixed(2) : '0.00';
            const maximo = p.precio_max ? p.precio_max.toLocaleString() : '0';
            console.log(`${empresa} ${tipo}: ${p.transacciones} transacciones, Promedio: ${promedio}, Max: ${maximo}`);
        });
        
        // 4. Identificar transacciones que deberían cambiar de empresa
        console.log('\n🔄 TRANSACCIONES QUE DEBERÍAN CAMBIAR:');
        console.log('─'.repeat(50));
        
        // Mensualidades asignadas a Symbiot (deberían ser Rockstar)
        const [mensualidadesSymbiot] = await executeQuery(`
            SELECT COUNT(*) as count, SUM(total) as monto_total
            FROM transacciones 
            WHERE empresa_id = 2 
            AND concepto LIKE '%mensualidad%'
        `);
        
        console.log(`📚 Mensualidades en Symbiot (ERROR): ${mensualidadesSymbiot.count} transacciones, $${mensualidadesSymbiot.monto_total?.toLocaleString() || 0}`);
        
        // Proyectos tech asignados a Rockstar (deberían ser Symbiot)
        const [proyectosRockstar] = await executeQuery(`
            SELECT COUNT(*) as count, SUM(total) as monto_total
            FROM transacciones 
            WHERE empresa_id = 1 
            AND (concepto LIKE '%proyecto%' 
                 OR concepto LIKE '%desarrollo%' 
                 OR concepto LIKE '%app%' 
                 OR concepto LIKE '%iot%'
                 OR concepto LIKE '%sistema%')
        `);
        
        console.log(`💻 Proyectos tech en Rockstar (POSIBLE ERROR): ${proyectosRockstar.count} transacciones, $${proyectosRockstar.monto_total?.toLocaleString() || 0}`);
        
        // 5. Analizar socios y ver a qué empresa deberían pertenecer
        console.log('\n👥 ANÁLISIS DE SOCIOS POR EMPRESA:');
        console.log('─'.repeat(50));
        
        const sociosPorEmpresa = await executeQuery(`
            SELECT 
                empresa_id,
                socio,
                COUNT(*) as transacciones,
                SUM(total) as monto_total
            FROM transacciones 
            GROUP BY empresa_id, socio
            HAVING transacciones > 5
            ORDER BY empresa_id, monto_total DESC
        `);
        
        let symbiotSocios = sociosPorEmpresa.filter(s => s.empresa_id === 2);
        let rockstarSocios = sociosPorEmpresa.filter(s => s.empresa_id === 1);
        
        console.log('SOCIOS EN SYMBIOT:');
        symbiotSocios.forEach(s => {
            console.log(`  ${s.socio}: ${s.transacciones} transacciones, $${s.monto_total.toLocaleString()}`);
        });
        
        console.log('\nSOCIOS EN ROCKSTAR (Top 5):');
        rockstarSocios.slice(0, 5).forEach(s => {
            console.log(`  ${s.socio}: ${s.transacciones} transacciones, $${s.monto_total.toLocaleString()}`);
        });
        
        // 6. PROPUESTA DE CORRECCIÓN
        console.log('\n🔧 PROPUESTA DE CORRECCIÓN:');
        console.log('─'.repeat(50));
        console.log('1. Mover TODAS las mensualidades de Symbiot → Rockstar');
        console.log('2. Verificar que proyectos tech estén en Symbiot');
        console.log('3. Procesar hoja "Alumnos" para llenar tabla alumnos');
        console.log('4. Relacionar transacciones de mensualidades con alumnos específicos');
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error.message);
    }
}

diagnosticarCategorizacion().then(() => {
    console.log('\n🔍 Diagnóstico de categorización completado');
    process.exit(0);
});