// ====================================================
// SCRIPT DE PRUEBAS API - TRANSACCIONES
// Archivo: test-api.js (crear en la raíz del proyecto)
// ====================================================

const BASE_URL = 'http://localhost:3000/gastos/api';

// Variable para almacenar el token de sesión
let sessionCookie = null;

async function testAPI() {
    console.log('🧪 INICIANDO PRUEBAS DE API\n');
    console.log('🔗 Base URL:', BASE_URL);
    
    try {
        // 1. Health Check
        await testHealthCheck();
        
        // 2. Login
        await testLogin();
        
        // 3. Obtener empresas
        await testGetEmpresas();
        
        // 4. Crear gasto de prueba
        await testCreateGasto();
        
        // 5. Crear ingreso de prueba
        await testCreateIngreso();
        
        // 6. Obtener transacciones
        await testGetTransacciones();
        
        console.log('\n🎉 ¡TODAS LAS PRUEBAS COMPLETADAS!');
        console.log('✅ Las APIs están funcionando correctamente');
        
    } catch (error) {
        console.error('\n❌ ERROR EN PRUEBAS:', error.message);
        process.exit(1);
    }
}

async function testHealthCheck() {
    console.log('1️⃣ Probando Health Check...');
    
    try {
        const response = await fetch(`${BASE_URL}/health`);
        const data = await response.json();
        
        if (data.status === 'OK') {
            console.log('✅ Health Check exitoso');
            console.log(`   Base de datos: ${data.services?.database || 'unknown'}`);
            console.log(`   Tablas: ${data.services?.tables || 'unknown'}`);
        } else {
            throw new Error('Health check falló');
        }
    } catch (error) {
        console.log('❌ Health Check falló:', error.message);
        throw error;
    }
}

async function testLogin() {
    console.log('\n2️⃣ Probando Login...');
    
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'marco@symbiot.com',
                password: 'admin123'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Login exitoso');
            console.log(`   Usuario: ${data.user.nombre}`);
            console.log(`   Empresa: ${data.user.empresa}`);
            
            // Guardar cookies de sesión
            const cookies = response.headers.get('set-cookie');
            if (cookies) {
                sessionCookie = cookies;
            }
        } else {
            throw new Error(data.error || 'Login falló');
        }
    } catch (error) {
        console.log('❌ Login falló:', error.message);
        throw error;
    }
}

async function testGetEmpresas() {
    console.log('\n3️⃣ Probando obtener empresas...');
    
    try {
        const response = await fetch(`${BASE_URL}/empresas`, {
            headers: {
                'Cookie': sessionCookie || ''
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Empresas obtenidas');
            console.log(`   Cantidad: ${data.data.length}`);
            data.data.forEach(empresa => {
                console.log(`   - ${empresa.nombre} (${empresa.tipo_negocio})`);
            });
        } else {
            throw new Error(data.message || 'Error obteniendo empresas');
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
            concepto: 'Gasto de prueba API',
            empresa_id: 1,
            forma_pago: 'TDC',
            cantidad: 1,
            precio_unitario: 100.50,
            tipo: 'G'
        };
        
        const response = await fetch(`${BASE_URL}/gastos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie || ''
            },
            body: JSON.stringify(gastoData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Gasto creado exitosamente');
            console.log(`   ID: ${data.data.id}`);
            console.log(`   Concepto: ${data.data.concepto}`);
            console.log(`   Total: $${data.data.total}`);
        } else {
            throw new Error(data.message || 'Error creando gasto');
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
            concepto: 'Ingreso de prueba API',
            empresa_id: 2,
            forma_pago: 'Transferencia',
            cantidad: 1,
            precio_unitario: 500.75,
            tipo: 'I'
        };
        
        const response = await fetch(`${BASE_URL}/ingresos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie || ''
            },
            body: JSON.stringify(ingresoData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Ingreso creado exitosamente');
            console.log(`   ID: ${data.data.id}`);
            console.log(`   Concepto: ${data.data.concepto}`);
            console.log(`   Total: $${data.data.total}`);
        } else {
            throw new Error(data.message || 'Error creando ingreso');
        }
    } catch (error) {
        console.log('❌ Error creando ingreso:', error.message);
        throw error;
    }
}

async function testGetTransacciones() {
    console.log('\n6️⃣ Probando obtener transacciones...');
    
    try {
        const response = await fetch(`${BASE_URL}/transacciones?limit=5`, {
            headers: {
                'Cookie': sessionCookie || ''
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Transacciones obtenidas');
            console.log(`   Cantidad: ${data.data.length}`);
            console.log(`   Total disponible: ${data.pagination.total}`);
            console.log('   Últimas transacciones:');
            data.data.forEach(t => {
                const tipo = t.tipo === 'G' ? 'Gasto' : 'Ingreso';
                console.log(`   - ${tipo}: ${t.concepto} - $${t.total}`);
            });
        } else {
            throw new Error(data.message || 'Error obteniendo transacciones');
        }
    } catch (error) {
        console.log('❌ Error obteniendo transacciones:', error.message);
        throw error;
    }
}

// Ejecutar pruebas
testAPI().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Fallo crítico:', error);
    process.exit(1);
});