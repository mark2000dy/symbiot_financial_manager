// ====================================================
// SCRIPT DE PRUEBAS API - VERSION HTTP NATIVO
// Archivo: test-api-simple.js
// ====================================================

import http from 'http';

const BASE_HOST = 'localhost';
const BASE_PORT = 3000;

// Variable para almacenar cookies de sesión
let sessionCookie = null;

async function testAPI() {
    console.log('🧪 INICIANDO PRUEBAS DE API\n');
    console.log('🔗 Base URL: http://' + BASE_HOST + ':' + BASE_PORT + '/gastos/api');
    
    try {
        // 1. Health Check
        await testHealthCheck();
        
        // 2. Login
        await testLogin();
        
        // 3. Obtener empresas
        await testGetEmpresas();
        
        // 4. Crear gasto
        await testCreateGasto();
        
        // 5. Crear ingreso
        await testCreateIngreso();
        
        console.log('\n🎉 ¡TODAS LAS PRUEBAS COMPLETADAS!');
        console.log('✅ Las APIs están funcionando correctamente');
        console.log('🚀 Listo para continuar con el frontend');
        
    } catch (error) {
        console.error('\n❌ ERROR EN PRUEBAS:', error.message);
        process.exit(1);
    }
}

function makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_HOST,
            port: BASE_PORT,
            path: '/gastos/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (sessionCookie) {
            options.headers['Cookie'] = sessionCookie;
        }

        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    // Guardar cookies de sesión si las hay
                    if (res.headers['set-cookie']) {
                        sessionCookie = res.headers['set-cookie'][0];
                    }
                    
                    const data = JSON.parse(body);
                    resolve({ status: res.statusCode, data, headers: res.headers });
                } catch (error) {
                    reject(new Error('Error parsing JSON: ' + body));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testHealthCheck() {
    console.log('1️⃣ Probando Health Check...');
    
    try {
        const response = await makeRequest('/health');
        
        if (response.data.status === 'OK') {
            console.log('✅ Health Check exitoso');
            console.log(`   Base de datos: ${response.data.services?.database || 'unknown'}`);
            console.log(`   Tablas: ${response.data.services?.tables || 'unknown'}`);
            console.log(`   Version: ${response.data.version}`);
        } else {
            throw new Error('Health check falló: ' + JSON.stringify(response.data));
        }
    } catch (error) {
        console.log('❌ Health Check falló:', error.message);
        throw error;
    }
}

async function testLogin() {
    console.log('\n2️⃣ Probando Login...');
    
    try {
        const loginData = {
            email: 'marco@symbiot.com',
            password: 'admin123'
        };
        
        const response = await makeRequest('/login', 'POST', loginData);
        
        if (response.data.success) {
            console.log('✅ Login exitoso');
            console.log(`   Usuario: ${response.data.user.nombre}`);
            console.log(`   Empresa: ${response.data.user.empresa}`);
            console.log(`   Rol: ${response.data.user.rol}`);
        } else {
            throw new Error(response.data.error || 'Login falló');
        }
    } catch (error) {
        console.log('❌ Login falló:', error.message);
        throw error;
    }
}

async function testGetEmpresas() {
    console.log('\n3️⃣ Probando obtener empresas...');
    
    try {
        const response = await makeRequest('/empresas');
        
        if (response.data.success) {
            console.log('✅ Empresas obtenidas');
            console.log(`   Cantidad: ${response.data.data.length}`);
            response.data.data.forEach(empresa => {
                console.log(`   - ${empresa.nombre} (ID: ${empresa.id})`);
            });
        } else {
            throw new Error(response.data.message || 'Error obteniendo empresas');
        }
    } catch (error) {
        console.log('❌ Error obteniendo empresas:', error.message);
        throw error;
    }
}

async function testCreateGasto() {
    console.log('\n4️⃣ Probando crear gasto...');
    
    try {
        const gastoData = {
            fecha: new Date().toISOString().split('T')[0],
            concepto: 'Gasto de prueba API - Test Automatico',
            empresa_id: 1, // Symbiot Technologies
            forma_pago: 'TDC',
            cantidad: 1,
            precio_unitario: 150.75
        };
        
        const response = await makeRequest('/gastos', 'POST', gastoData);
        
        if (response.data.success) {
            console.log('✅ Gasto creado exitosamente');
            console.log(`   ID: ${response.data.data.id}`);
            console.log(`   Concepto: ${response.data.data.concepto}`);
            console.log(`   Total: $${response.data.data.total}`);
            console.log(`   Socio: ${response.data.data.socio}`);
        } else {
            throw new Error(response.data.message || 'Error creando gasto');
        }
    } catch (error) {
        console.log('❌ Error creando gasto:', error.message);
        throw error;
    }
}

async function testCreateIngreso() {
    console.log('\n5️⃣ Probando crear ingreso...');
    
    try {
        const ingresoData = {
            fecha: new Date().toISOString().split('T')[0],
            concepto: 'Ingreso de prueba API - Test Automatico',
            empresa_id: 2, // Rockstar Skull
            forma_pago: 'Transferencia',
            cantidad: 1,
            precio_unitario: 750.50
        };
        
        const response = await makeRequest('/ingresos', 'POST', ingresoData);
        
        if (response.data.success) {
            console.log('✅ Ingreso creado exitosamente');
            console.log(`   ID: ${response.data.data.id}`);
            console.log(`   Concepto: ${response.data.data.concepto}`);
            console.log(`   Total: $${response.data.data.total}`);
            console.log(`   Socio: ${response.data.data.socio}`);
        } else {
            throw new Error(response.data.message || 'Error creando ingreso');
        }
    } catch (error) {
        console.log('❌ Error creando ingreso:', error.message);
        throw error;
    }
}

// Ejecutar pruebas
testAPI().then(() => {
    console.log('\n✅ Test completado exitosamente');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Fallo crítico:', error);
    process.exit(1);
});