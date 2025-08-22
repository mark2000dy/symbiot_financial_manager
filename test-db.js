// ====================================================
// TEST DE CONEXIÓN A BASE DE DATOS
// Archivo: test-db.js
// ====================================================

import { testConnection, executeQuery } from './server/config/database.js';

async function testDatabase() {
    console.log('🔍 Iniciando pruebas de base de datos...\n');
    
    try {
        // Test 1: Conexión básica
        console.log('1. Probando conexión básica...');
        const isConnected = await testConnection();
        
        if (!isConnected) {
            console.error('❌ No se pudo conectar a la base de datos');
            console.error('💡 Verifica:');
            console.error('   - Que MySQL esté ejecutándose');
            console.error('   - Que la base de datos "gastos_app_db" exista');
            console.error('   - Que el usuario "gastos_user" tenga permisos');
            return;
        }
        console.log('✅ Conexión exitosa\n');
        
        // Test 2: Verificar tablas
        console.log('2. Verificando estructura de tablas...');
        try {
            const tables = await executeQuery('SHOW TABLES');
            if (tables.length > 0) {
                console.log('📋 Tablas encontradas:', tables.map(t => Object.values(t)[0]));
            } else {
                console.log('⚠️ No hay tablas. Ejecuta el schema SQL primero.');
            }
        } catch (error) {
            console.log('⚠️ No se pudieron verificar las tablas:', error.message);
        }
        
        console.log('\n✅ Test de base de datos completado!');
        console.log('🔗 Servidor: http://localhost:3000/gastos');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
    }
    
    process.exit(0);
}

testDatabase();
