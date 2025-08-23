// ====================================================
// DIAGNÓSTICO APPSERV MYSQL - GASTOS SYMBIOT APP
// Archivo: diagnose-appserv.js
// ====================================================

import mysql from 'mysql2/promise';

async function diagnoseAppServ() {
    console.log('🔍 DIAGNÓSTICO APPSERV MYSQL\n');
    console.log('📋 Información del sistema:');
    console.log('   AppServ MySQL Version: 8.0.17');
    console.log('   Puerto típico: 3306');
    console.log('   Usuario típico: root\n');
    
    // Credenciales típicas de AppServ
    const commonCredentials = [
        { user: 'root', password: '', description: 'Root sin contraseña (defecto AppServ)' },
        { user: 'root', password: 'symbiot2017#', description: 'Root con contraseña "root"' },
        { user: 'root', password: 'mysql', description: 'Root con contraseña "mysql"' },
        { user: 'root', password: '123456', description: 'Root con contraseña "123456"' }
    ];
    
    let workingConnection = null;
    
    console.log('🔍 Probando credenciales comunes de AppServ...\n');
    
    for (const cred of commonCredentials) {
        try {
            console.log(`🔑 Probando: ${cred.description}`);
            const connection = await mysql.createConnection({
                host: 'localhost',
                port: 3306,
                user: cred.user,
                password: cred.password
            });
            
            // Probar consulta
            await connection.execute('SELECT VERSION() as version');
            console.log('✅ ¡CONEXIÓN EXITOSA!');
            
            workingConnection = { ...cred, connection };
            break;
            
        } catch (error) {
            console.log('❌ No funciona');
        }
    }
    
    if (!workingConnection) {
        console.log('\n❌ NINGUNA CREDENCIAL FUNCIONÓ');
        console.log('\n🔧 SOLUCIONES POSIBLES:');
        console.log('1. Verificar que AppServ esté iniciado');
        console.log('2. Reiniciar servicios AppServ desde el panel');
        console.log('3. Reinstalar AppServ completamente');
        console.log('4. Usar phpMyAdmin para verificar credenciales');
        console.log('   URL típica: http://localhost/phpmyadmin/');
        return;
    }
    
    console.log(`\n✅ CREDENCIALES VÁLIDAS ENCONTRADAS:`);
    console.log(`   Usuario: ${workingConnection.user}`);
    console.log(`   Contraseña: "${workingConnection.password}" ${workingConnection.password === '' ? '(vacía)' : ''}`);
    
    try {
        // Obtener información del servidor
        console.log('\n📊 INFORMACIÓN DEL SERVIDOR:');
        const [version] = await workingConnection.connection.execute('SELECT VERSION() as version');
        console.log(`   Versión MySQL: ${version[0].version}`);
        
        // Listar bases de datos
        const [databases] = await workingConnection.connection.execute('SHOW DATABASES');
        console.log(`   Bases de datos: ${databases.map(db => Object.values(db)[0]).join(', ')}`);
        
        // Verificar si existe nuestra base de datos
        const hasOurDB = databases.some(db => Object.values(db)[0] === 'gastos_app_db');
        console.log(`   Base 'gastos_app_db': ${hasOurDB ? '✅ Existe' : '❌ No existe'}`);
        
        // Verificar usuarios
        const [users] = await workingConnection.connection.execute(
            "SELECT User, Host FROM mysql.user WHERE User IN ('root', 'gastos_user')"
        );
        console.log(`\n👥 USUARIOS ENCONTRADOS:`);
        users.forEach(user => {
            console.log(`   - ${user.User}@${user.Host}`);
        });
        
        const hasGastosUser = users.some(user => user.User === 'gastos_user');
        console.log(`   Usuario 'gastos_user': ${hasGastosUser ? '✅ Existe' : '❌ No existe'}`);
        
        // Si necesitamos crear todo
        if (!hasOurDB || !hasGastosUser) {
            console.log('\n🔨 NECESITAMOS CREAR:');
            if (!hasOurDB) console.log('   - Base de datos gastos_app_db');
            if (!hasGastosUser) console.log('   - Usuario gastos_user');
            
            console.log('\n¿Crear automáticamente? (Continuando en 3 segundos...)');
            
            // Esperar 3 segundos
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await setupDatabase(workingConnection.connection);
        } else {
            console.log('\n✅ TODO ESTÁ CONFIGURADO CORRECTAMENTE');
        }
        
        await workingConnection.connection.end();
        
    } catch (error) {
        console.error('\n❌ Error durante el diagnóstico:', error.message);
    }
}

async function setupDatabase(connection) {
    try {
        console.log('\n🔨 CONFIGURANDO BASE DE DATOS...');
        
        // Crear base de datos
        await connection.execute(`
            CREATE DATABASE IF NOT EXISTS gastos_app_db 
            CHARACTER SET utf8mb4 
            COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Base de datos gastos_app_db creada');
        
        // Crear usuario (MySQL 8.0 syntax)
        try {
            await connection.execute(`CREATE USER 'gastos_user'@'localhost' IDENTIFIED BY 'Gastos2025!'`);
            console.log('✅ Usuario gastos_user creado');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('ℹ️ Usuario gastos_user ya existe');
            } else {
                throw error;
            }
        }
        
        // Otorgar permisos
        await connection.execute(`GRANT ALL PRIVILEGES ON gastos_app_db.* TO 'gastos_user'@'localhost'`);
        console.log('✅ Permisos otorgados');
        
        // Aplicar cambios
        await connection.execute('FLUSH PRIVILEGES');
        console.log('✅ Cambios aplicados');
        
        console.log('\n🎉 ¡CONFIGURACIÓN COMPLETADA!');
        console.log('📝 Ahora puedes ejecutar: npm run dev');
        
    } catch (error) {
        console.error('❌ Error configurando base de datos:', error.message);
    }
}

// Función para verificar servicios AppServ
async function checkAppServServices() {
    console.log('\n🔍 VERIFICANDO SERVICIOS APPSERV:');
    console.log('💡 Manualmente verifica:');
    console.log('   1. Panel AppServ: Busca "AppServ" en el menú inicio');
    console.log('   2. Servicios Windows: Apache y MySQL deben estar iniciados');
    console.log('   3. phpMyAdmin: http://localhost/phpmyadmin/');
    console.log('   4. Puerto 3306 debe estar libre para MySQL');
}

console.log('🚀 Iniciando diagnóstico...\n');
diagnoseAppServ().then(() => {
    console.log('\n✅ Diagnóstico completado');
    process.exit(0);
}).catch(error => {
    console.error('❌ Error fatal:', error.message);
    checkAppServServices();
    process.exit(1);
});