// ====================================================
// CONFIGURACIÓN RÁPIDA APPSERV
// Archivo: setup-appserv.js
// ====================================================

import mysql from 'mysql2/promise';
import { testConnection } from './server/config/database.js';

async function setupAppServ() {
    console.log('🔧 CONFIGURACIÓN RÁPIDA APPSERV MYSQL\n');
    
    // Intentar conectar con credenciales típicas de AppServ
    const credentials = [
        { user: 'root', password: '' },
        { user: 'root', password: 'root' },
        { user: 'root', password: 'mysql' }
    ];
    
    let connection = null;
    let workingCred = null;
    
    for (const cred of credentials) {
        try {
            console.log(`🔑 Probando root con contraseña: "${cred.password || '(vacía)'}"`);
            connection = await mysql.createConnection({
                host: 'localhost',
                port: 3306,
                user: cred.user,
                password: cred.password
            });
            
            await connection.execute('SELECT 1');
            console.log('✅ ¡Conexión exitosa!');
            workingCred = cred;
            break;
        } catch (error) {
            console.log('❌ No funciona');
            if (connection) {
                try { await connection.end(); } catch {}
                connection = null;
            }
        }
    }
    
    if (!connection) {
        console.log('\n❌ NO SE PUDO CONECTAR CON CREDENCIALES TÍPICAS');
        console.log('\n🔧 REVISA MANUALMENTE:');
        console.log('1. ¿AppServ está iniciado?');
        console.log('2. ¿Puedes acceder a http://localhost/phpmyadmin/ ?');
        console.log('3. ¿MySQL aparece como servicio activo en Windows?');
        return;
    }
    
    try {
        console.log(`\n🔨 Configurando con credenciales: root / "${workingCred.password || '(vacía)'}"`);
        
        // 1. Crear base de datos
        console.log('\n📁 Creando base de datos...');
        await connection.execute(`
            CREATE DATABASE IF NOT EXISTS gastos_app_db 
            CHARACTER SET utf8mb4 
            COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Base de datos "gastos_app_db" lista');
        
        // 2. Crear usuario
        console.log('\n👤 Creando usuario...');
        try {
            // Para MySQL 8.0+ (AppServ 8.0.17)
            await connection.execute(`DROP USER IF EXISTS 'gastos_user'@'localhost'`);
            await connection.execute(`CREATE USER 'gastos_user'@'localhost' IDENTIFIED BY 'Gastos2025!'`);
            console.log('✅ Usuario "gastos_user" creado');
        } catch (error) {
            console.log('⚠️ Error creando usuario:', error.message);
        }
        
        // 3. Otorgar permisos
        console.log('\n🔑 Asignando permisos...');
        await connection.execute(`GRANT ALL PRIVILEGES ON gastos_app_db.* TO 'gastos_user'@'localhost'`);
        await connection.execute(`FLUSH PRIVILEGES`);
        console.log('✅ Permisos asignados');
        
        // 4. Verificar que todo funciona
        console.log('\n🧪 Verificando configuración...');
        await connection.end();
        
        // Probar conexión con nuestras credenciales
        const testResult = await testConnection();
        if (testResult) {
            console.log('✅ ¡CONFIGURACIÓN EXITOSA!');
            console.log('\n🎉 TODO LISTO PARA USAR:');
            console.log('   Base de datos: gastos_app_db');
            console.log('   Usuario: gastos_user');
            console.log('   Contraseña: Gastos2025!');
            console.log('\n🚀 Ejecuta: npm run dev');
        } else {
            console.log('❌ La verificación falló - revisar configuración');
        }
        
    } catch (error) {
        console.error('\n❌ Error durante configuración:', error.message);
        if (connection) {
            try { await connection.end(); } catch {}
        }
    }
}

// Verificación adicional de servicios
function checkServices() {
    console.log('\n💡 VERIFICACIONES ADICIONALES:');
    console.log('1. Panel de Control → Servicios → Buscar "MySQL"');
    console.log('2. AppServ Panel → Start/Stop services');
    console.log('3. phpMyAdmin: http://localhost/phpmyadmin/');
    console.log('4. Test page: http://localhost/');
}

setupAppServ().then(() => {
    console.log('\n✅ Script completado');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Error fatal:', error.message);
    checkServices();
    process.exit(1);
});