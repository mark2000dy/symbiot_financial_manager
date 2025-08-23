// ====================================================
// TEST DE CONEXIÓN A BASE DE DATOS (MEJORADO)
// Archivo: test-db.js
// ====================================================

import { testConnection, executeQuery, config } from './server/config/database.js';
import mysql from 'mysql2/promise';

async function testDatabase() {
    console.log('🔍 Iniciando diagnóstico completo de base de datos...\n');
    
    console.log('📋 Configuración actual:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   Usuario: ${config.user}`);
    console.log(`   Puerto: ${config.port}\n`);
    
    try {
        // Test 1: Verificar si MySQL está ejecutándose
        console.log('1️⃣ Verificando servidor MySQL...');
        try {
            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: 'root', // Intentar con root para verificar servidor
                password: '' // Sin contraseña inicialmente
            });
            await connection.end();
            console.log('✅ Servidor MySQL está ejecutándose');
        } catch (error) {
            console.log('❌ Servidor MySQL no responde o credenciales de root incorrectas');
            console.log('💡 Verifica que MySQL esté instalado y ejecutándose');
            console.log('💡 Inicia MySQL: net start mysql (Windows) o sudo service mysql start (Linux)\n');
            
            // Intentar conectar sin especificar usuario
            try {
                const testConn = await mysql.createConnection({
                    host: config.host,
                    port: config.port
                });
                await testConn.end();
                console.log('✅ Puerto MySQL responde, problema con credenciales');
            } catch (portError) {
                console.log('❌ Puerto MySQL no responde - servidor puede estar apagado\n');
                return;
            }
        }
        
        // Test 2: Verificar si existe la base de datos
        console.log('\n2️⃣ Verificando base de datos...');
        try {
            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: 'root',
                password: process.env.MYSQL_ROOT_PASSWORD || ''
            });
            
            const [databases] = await connection.execute(
                "SHOW DATABASES LIKE ?", 
                [config.database]
            );
            
            if (databases.length > 0) {
                console.log(`✅ Base de datos '${config.database}' existe`);
            } else {
                console.log(`❌ Base de datos '${config.database}' NO existe`);
                console.log('💡 Ejecuta el script database/setup.sql como root en MySQL');
            }
            
            await connection.end();
        } catch (error) {
            console.log('⚠️ No se pudo verificar la base de datos con usuario root');
            console.log('💡 Puede necesitar especificar contraseña de root en .env como MYSQL_ROOT_PASSWORD');
        }
        
        // Test 3: Verificar usuario de aplicación
        console.log('\n3️⃣ Verificando usuario de aplicación...');
        try {
            const connection = await mysql.createConnection({
                host: config.host,
                port: config.port,
                user: 'root',
                password: process.env.MYSQL_ROOT_PASSWORD || ''
            });
            
            const [users] = await connection.execute(
                "SELECT User, Host FROM mysql.user WHERE User = ?", 
                [config.user]
            );
            
            if (users.length > 0) {
                console.log(`✅ Usuario '${config.user}' existe`);
            } else {
                console.log(`❌ Usuario '${config.user}' NO existe`);
                console.log('💡 Ejecuta el script database/setup.sql para crear el usuario');
            }
            
            await connection.end();
        } catch (error) {
            console.log('⚠️ No se pudo verificar usuarios (requiere acceso root)');
        }
        
        // Test 4: Intentar conexión con credenciales de aplicación
        console.log('\n4️⃣ Probando conexión con credenciales de aplicación...');
        const isConnected = await testConnection();
        
        if (isConnected) {
            console.log('✅ Conexión exitosa con credenciales de aplicación');
            
            // Test 5: Verificar tablas
            console.log('\n5️⃣ Verificando estructura de tablas...');
            try {
                const tables = await executeQuery('SHOW TABLES');
                if (tables.length > 0) {
                    console.log('📋 Tablas encontradas:', tables.map(t => Object.values(t)[0]));
                    
                    // Verificar tabla específica
                    const transacciones = tables.find(t => Object.values(t)[0] === 'transacciones');
                    if (transacciones) {
                        console.log('✅ Tabla transacciones existe');
                        
                        // Contar registros
                        const [count] = await executeQuery('SELECT COUNT(*) as total FROM transacciones');
                        console.log(`📊 Registros en transacciones: ${count[0].total}`);
                    } else {
                        console.log('⚠️ Tabla transacciones no existe - ejecuta schema.sql');
                    }
                } else {
                    console.log('⚠️ No hay tablas. Ejecuta database/schema.sql');
                }
            } catch (error) {
                console.log('⚠️ Error verificando tablas:', error.message);
            }
            
            console.log('\n🎉 ¡DIAGNÓSTICO COMPLETADO EXITOSAMENTE!');
            console.log('🔗 Servidor listo: http://localhost:3000/gastos');
            
        } else {
            console.log('\n❌ CONEXIÓN FALLIDA');
            console.log('\n🔧 PASOS PARA RESOLVER:');
            console.log('1. Abrir MySQL como root: mysql -u root -p');
            console.log('2. Ejecutar: SOURCE database/setup.sql;');
            console.log('3. Crear archivo .env copiando .env.example');
            console.log('4. Ejecutar nuevamente: npm run test');
        }
        
    } catch (error) {
        console.error('\n❌ Error inesperado en diagnóstico:', error.message);
    }
    
    process.exit(0);
}

// Función auxiliar para mostrar ayuda
function showHelp() {
    console.log('\n📘 GUÍA DE SOLUCIÓN DE PROBLEMAS:');
    console.log('\n🔧 Si MySQL no responde:');
    console.log('   Windows: net start mysql');
    console.log('   Linux/Mac: sudo service mysql start');
    console.log('\n🔧 Si el usuario no existe:');
    console.log('   1. mysql -u root -p');
    console.log('   2. SOURCE database/setup.sql;');
    console.log('\n🔧 Si necesitas cambiar credenciales:');
    console.log('   1. Copia .env.example como .env');
    console.log('   2. Ajusta las variables de DB_*');
}

testDatabase();