// ====================================================
// SCRIPT DE PRUEBA RÁPIDA - API RESUMEN
// Archivo: test-resumen.js
// Para probar específicamente el endpoint de resumen
// ====================================================

const BASE_URL = 'http://localhost:3000/gastos/api';

async function testResumenAPI() {
    console.log('🧪 PROBANDO API DE RESUMEN...\n');
    
    try {
        // 1. Login primero
        console.log('1️⃣ Haciendo login...');
        const loginResponse = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'marco@symbiot.com',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        if (!loginData.success) {
            throw new Error('Login falló');
        }
        
        // Extraer cookies de sesión
        const cookies = loginResponse.headers.get('set-cookie');
        console.log('✅ Login exitoso');
        
        // 2. Probar endpoint de resumen
        console.log('\n2️⃣ Probando endpoint de resumen...');
        const resumenResponse = await fetch(`${BASE_URL}/transacciones/resumen`, {
            headers: {
                'Cookie': cookies || ''
            }
        });
        
        const resumenData = await resumenResponse.json();
        console.log('📊 Respuesta del resumen:', JSON.stringify(resumenData, null, 2));
        
        if (resumenData.success) {
            const { data } = resumenData;
            console.log('\n✅ RESUMEN OBTENIDO EXITOSAMENTE:');
            console.log(`💰 Ingresos: $${formatCurrency(data.ingresos || 0)}`);
            console.log(`💸 Gastos: $${formatCurrency(data.gastos || 0)}`);
            console.log(`💼 Balance: $${formatCurrency(data.balance || 0)}`);
            console.log(`📊 Transacciones: ${data.total_transacciones || 0}`);
            
            if (data.total_transacciones > 0) {
                console.log('\n🎉 ¡Los datos están correctos! El dashboard debería actualizarse.');
            } else {
                console.log('\n⚠️ No hay transacciones en la base de datos.');
            }
        } else {
            throw new Error(`API falló: ${resumenData.message}`);
        }
        
        // 3. Probar algunas transacciones
        console.log('\n3️⃣ Verificando transacciones...');
        const transaccionesResponse = await fetch(`${BASE_URL}/transacciones?limit=5`, {
            headers: {
                'Cookie': cookies || ''
            }
        });
        
        const transaccionesData = await transaccionesResponse.json();
        if (transaccionesData.success && transaccionesData.data.length > 0) {
            console.log(`📋 Encontradas ${transaccionesData.data.length} transacciones recientes:`);
            transaccionesData.data.forEach((t, index) => {
                const tipo = t.tipo === 'I' ? '💰' : '💸';
                console.log(`   ${index + 1}. ${tipo} ${t.concepto} - $${formatCurrency(t.total)}`);
            });
        } else {
            console.log('⚠️ No se encontraron transacciones');
        }
        
    } catch (error) {
        console.error('❌ Error en prueba:', error.message);
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

// Ejecutar test
testResumenAPI();