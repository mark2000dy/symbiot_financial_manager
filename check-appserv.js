// ====================================================
// VERIFICADOR DE ESTADO APPSERV
// Archivo: check-appserv.js
// ====================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);

async function checkAppServStatus() {
    console.log('🔍 VERIFICANDO ESTADO DE APPSERV\n');
    
    // 1. Verificar servicios de Windows
    console.log('1️⃣ Verificando servicios de Windows...');
    try {
        const { stdout } = await execAsync('sc query mysql');
        if (stdout.includes('RUNNING')) {
            console.log('✅ Servicio MySQL está ejecutándose');
        } else if (stdout.includes('STOPPED')) {
            console.log('❌ Servicio MySQL está detenido');
            console.log('💡 Ejecutar: net start mysql');
        }
    } catch (error) {
        console.log('⚠️ No se encontró servicio MySQL o no se puede acceder');
        console.log('💡 Verifica la instalación de AppServ');
    }
    
    // 2. Verificar puerto MySQL
    console.log('\n2️⃣ Verificando puerto MySQL (3306)...');
    try {
        const { stdout } = await execAsync('netstat -an | findstr :3306');
        if (stdout.includes('LISTENING')) {
            console.log('✅ Puerto 3306 está en uso (MySQL probablemente funcionando)');
        } else {
            console.log('❌ Puerto 3306 no está en uso');
        }
    } catch (error) {
        console.log('⚠️ No se pudo verificar el puerto 3306');
    }
    
    // 3. Verificar Apache (para phpMyAdmin)
    console.log('\n3️⃣ Verificando Apache...');
    try {
        const { stdout } = await execAsync('netstat -an | findstr :80');
        if (stdout.includes('LISTENING')) {
            console.log('✅ Puerto 80 está en uso (Apache probablemente funcionando)');
        } else {
            console.log('❌ Puerto 80 no está en uso - Apache puede estar detenido');
        }
    } catch (error) {
        console.log('⚠️ No se pudo verificar Apache');
    }
    
    // 4. Probar acceso a localhost
    console.log('\n4️⃣ Probando acceso web...');
    await testWebAccess('http://localhost', 'Página principal');
    await testWebAccess('http://localhost/phpmyadmin', 'phpMyAdmin');
    
    console.log('\n📋 INSTRUCCIONES SEGÚN EL ESTADO:');
    console.log('\n✅ Si todo está verde:');
    console.log('   → Ejecutar: npm run setup-appserv');
    console.log('\n⚠️ Si hay servicios detenidos:');
    console.log('   → Abrir Panel de AppServ');
    console.log('   → O ejecutar: net start mysql && net start apache2.4');
    console.log('\n❌ Si nada funciona:');
    console.log('   → Reinstalar AppServ');
    console.log('   → O usar XAMPP como alternativa');
    
    console.log('\n🔗 Enlaces útiles:');
    console.log('   AppServ: http://localhost/');
    console.log('   phpMyAdmin: http://localhost/phpmyadmin/');
    console.log('   Panel AppServ: Menú Inicio → AppServ');
}

function testWebAccess(url, name) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            if (res.statusCode === 200) {
                console.log(`✅ ${name} accesible`);
            } else {
                console.log(`⚠️ ${name} responde pero con error (${res.statusCode})`);
            }
            resolve();
        });
        
        req.on('error', () => {
            console.log(`❌ ${name} no accesible`);
            resolve();
        });
        
        req.setTimeout(3000, () => {
            req.destroy();
            console.log(`⏱️ ${name} - timeout`);
            resolve();
        });
    });
}

checkAppServStatus().then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Error durante verificación:', error.message);
    process.exit(1);
});