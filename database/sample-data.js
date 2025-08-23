// ====================================================
// DATOS DE MUESTRA SIMPLES - SIN EXCEL
// Archivo: database/sample-data.js
// Para probar rápidamente sin archivos Excel
// ====================================================

import { executeQuery } from '../server/config/database.js';

const DATOS_MUESTRA = {
    // Ingresos de Symbiot Technologies
    ingresos_symbiot: [
        {
            fecha: '2024-05-09',
            concepto: 'CTIM-3 Huella Estructural - Primera fase',
            socio: 'Marco Delgado',
            empresa_id: 2,
            forma_pago: 'Transferencia',
            cantidad: 1,
            precio_unitario: 42125.00,
            tipo: 'I',
            created_by: 1
        },
        {
            fecha: '2025-01-13',
            concepto: 'CTIM-3 Huella Estructural - Segunda fase',
            socio: 'Marco Delgado',
            empresa_id: 2,
            forma_pago: 'Transferencia',
            cantidad: 1,
            precio_unitario: 77250.00,
            tipo: 'I',
            created_by: 1
        },
        {
            fecha: '2024-11-15',
            concepto: 'Desarrollo Sistema IoT Agro',
            socio: 'Marco Delgado',
            empresa_id: 2,
            forma_pago: 'Cheque',
            cantidad: 1,
            precio_unitario: 58000.00,
            tipo: 'I',
            created_by: 1
        }
    ],
    
    // Gastos de Symbiot Technologies
    gastos_symbiot: [
        {
            fecha: '2024-04-15',
            concepto: 'Certificado SSL symbiot-technologies.com',
            socio: 'Marco Delgado',
            empresa_id: 2,
            forma_pago: 'TDC',
            cantidad: 1,
            precio_unitario: 519.68,
            tipo: 'G',
            created_by: 1
        },
        {
            fecha: '2024-04-15',
            concepto: 'Servicio Hosting y Dominio symbiot-technologies.com',
            socio: 'Marco Delgado',
            empresa_id: 2,
            forma_pago: 'TDC',
            cantidad: 1,
            precio_unitario: 893.20,
            tipo: 'G',
            created_by: 1
        },
        {
            fecha: '2024-06-20',
            concepto: 'Licencia Microsoft Office 365',
            socio: 'Marco Delgado',
            empresa_id: 2,
            forma_pago: 'TDC',
            cantidad: 1,
            precio_unitario: 2400.00,
            tipo: 'G',
            created_by: 1
        },
        {
            fecha: '2024-08-10',
            concepto: 'Equipo de desarrollo - Arduino y sensores',
            socio: 'Marco Delgado',
            empresa_id: 2,
            forma_pago: 'Transferencia',
            cantidad: 5,
            precio_unitario: 850.00,
            tipo: 'G',
            created_by: 1
        }
    ],
    
    // Ingresos de RockstarSkull
    ingresos_rockstar: [
        {
            fecha: '2024-08-01',
            concepto: 'Mensualidad Guitarra - Gwyneth Adriana Tagliabue',
            socio: 'Hugo Vázquez',
            empresa_id: 1,
            forma_pago: 'TPV',
            cantidad: 1,
            precio_unitario: 1500.00,
            tipo: 'I',
            created_by: 3
        },
        {
            fecha: '2024-08-01',
            concepto: 'Mensualidad Guitarra - Alejandro Navarro',
            socio: 'Hugo Vázquez',
            empresa_id: 1,
            forma_pago: 'Efectivo',
            cantidad: 1,
            precio_unitario: 1500.00,
            tipo: 'I',
            created_by: 3
        },
        {
            fecha: '2024-08-05',
            concepto: 'Mensualidad Batería - Carlos Mendez',
            socio: 'Antonio Razo',
            empresa_id: 1,
            forma_pago: 'Transferencia',
            cantidad: 1,
            precio_unitario: 1800.00,
            tipo: 'I',
            created_by: 2
        },
        {
            fecha: '2024-09-01',
            concepto: 'Mensualidad Guitarra - Gwyneth Adriana Tagliabue',
            socio: 'Hugo Vázquez',
            empresa_id: 1,
            forma_pago: 'TPV',
            cantidad: 1,
            precio_unitario: 1350.00,
            tipo: 'I',
            created_by: 3
        }
    ],
    
    // Gastos de RockstarSkull
    gastos_rockstar: [
        {
            fecha: '2024-03-20',
            concepto: 'Dominio y Cuentas Rockstarskull',
            socio: 'Antonio Razo',
            empresa_id: 1,
            forma_pago: 'TDC',
            cantidad: 1,
            precio_unitario: 569.00,
            tipo: 'G',
            created_by: 2
        },
        {
            fecha: '2024-03-20',
            concepto: 'Logo profesional',
            socio: 'Antonio Razo',
            empresa_id: 1,
            forma_pago: 'Transferencia',
            cantidad: 1,
            precio_unitario: 1000.00,
            tipo: 'G',
            created_by: 2
        },
        {
            fecha: '2024-05-15',
            concepto: 'Amplificador Marshall 100W',
            socio: 'Antonio Razo',
            empresa_id: 1,
            forma_pago: 'Efectivo',
            cantidad: 1,
            precio_unitario: 8500.00,
            tipo: 'G',
            created_by: 2
        },
        {
            fecha: '2024-07-08',
            concepto: 'Cuerdas de guitarra - Stock mensual',
            socio: 'Hugo Vázquez',
            empresa_id: 1,
            forma_pago: 'Efectivo',
            cantidad: 20,
            precio_unitario: 85.00,
            tipo: 'G',
            created_by: 3
        },
        {
            fecha: '2024-08-12',
            concepto: 'Renta local - Agosto',
            socio: 'Antonio Razo',
            empresa_id: 1,
            forma_pago: 'Transferencia',
            cantidad: 1,
            precio_unitario: 12000.00,
            tipo: 'G',
            created_by: 2
        }
    ]
};

async function poblarDatosMuestra() {
    try {
        console.log('🌱 POBLANDO DATOS DE MUESTRA...');
        
        // Limpiar datos existentes
        await executeQuery('DELETE FROM transacciones WHERE 1=1');
        console.log('🧹 Datos existentes limpiados');
        
        let totalInsertados = 0;
        
        // Insertar cada categoría
        for (const [categoria, transacciones] of Object.entries(DATOS_MUESTRA)) {
            console.log(`\n📊 Insertando ${categoria.replace('_', ' ')}...`);
            
            for (const transaccion of transacciones) {
                const query = `
                    INSERT INTO transacciones (
                        fecha, concepto, socio, empresa_id, forma_pago,
                        cantidad, precio_unitario, tipo, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                await executeQuery(query, [
                    transaccion.fecha,
                    transaccion.concepto,
                    transaccion.socio,
                    transaccion.empresa_id,
                    transaccion.forma_pago,
                    transaccion.cantidad,
                    transaccion.precio_unitario,
                    transaccion.tipo,
                    transaccion.created_by
                ]);
                
                totalInsertados++;
                console.log(`✅ ${transaccion.concepto} - $${formatearPrecio(transaccion.cantidad * transaccion.precio_unitario)}`);
            }
        }
        
        console.log(`\n🎉 Total de ${totalInsertados} transacciones insertadas`);
        
        // Mostrar resumen
        await mostrarResumen();
        
    } catch (error) {
        console.error('❌ Error poblando datos de muestra:', error);
        throw error;
    }
}

async function mostrarResumen() {
    try {
        const resumen = await executeQuery(`
            SELECT 
                e.nombre as empresa,
                t.tipo,
                COUNT(*) as cantidad,
                ROUND(SUM(t.total), 2) as total_monto
            FROM transacciones t
            JOIN empresas e ON t.empresa_id = e.id
            GROUP BY e.nombre, t.tipo
            ORDER BY e.nombre, t.tipo
        `);
        
        console.log('\n📊 RESUMEN DE DATOS:');
        resumen.forEach(row => {
            const tipo = row.tipo === 'I' ? '💰 Ingresos' : '💸 Gastos';
            console.log(`${row.empresa} - ${tipo}: ${row.cantidad} transacciones, ${formatearPrecio(row.total_monto)}`);
        });
    } catch (error) {
        console.error('⚠️ Error generando resumen:', error);
    }
}

function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(precio);
}

// 🚀 Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    poblarDatosMuestra()
        .then(() => {
            console.log('\n✅ Datos de muestra insertados exitosamente');
            console.log('🔗 Dashboard: http://localhost:3000/gastos');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Error:', error);
            process.exit(1);
        });
}

export { poblarDatosMuestra };