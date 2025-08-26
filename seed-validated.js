// ====================================================
// SCRIPT VALIDADO - POBLACIÓN DESDE EXCEL
// Archivo: seed-validated.js (crear en la raíz)
// CON VALIDACIONES DE CONSTRAINTS
// ====================================================

import { executeQuery } from './server/config/database.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const EXCEL_FILE = 'Gastos Socios Symbiot.xlsx';

// ⏰ TIMEOUT DE SEGURIDAD
const TIMEOUT_MS = 10 * 60 * 1000;
setTimeout(() => {
    console.log('\n⏰ TIMEOUT - Script tardó demasiado');
    process.exit(1);
}, TIMEOUT_MS);

// 📅 Meses exactos según diagnóstico
const MESES_COLUMNAS = [
    { nombre: 'Julio', fecha: '2023-07-31', año: 2023, mes: 7 },
    { nombre: 'Agosto', fecha: '2023-08-31', año: 2023, mes: 8 },
    { nombre: 'Septiembre', fecha: '2023-09-30', año: 2023, mes: 9 },
    { nombre: 'Octubre', fecha: '2023-10-31', año: 2023, mes: 10 },
    { nombre: 'Noviembre', fecha: '2023-11-30', año: 2023, mes: 11 },
    { nombre: 'Diciembre', fecha: '2023-12-31', año: 2023, mes: 12 },
    { nombre: 'Enero', fecha: '2024-01-31', año: 2024, mes: 1 },
    { nombre: 'Febrero', fecha: '2024-02-29', año: 2024, mes: 2 },
    { nombre: 'Marzo', fecha: '2024-03-31', año: 2024, mes: 3 },
    { nombre: 'Abril', fecha: '2024-04-30', año: 2024, mes: 4 },
    { nombre: 'Mayo', fecha: '2024-05-31', año: 2024, mes: 5 },
    { nombre: 'Junio', fecha: '2024-06-30', año: 2024, mes: 6 },
    { nombre: 'Julio2', fecha: '2024-07-31', año: 2024, mes: 7 },
    { nombre: 'Agosto2', fecha: '2024-08-31', año: 2024, mes: 8 },
    { nombre: 'Septiembre2', fecha: '2024-09-30', año: 2024, mes: 9 },
    { nombre: 'Octubre2', fecha: '2024-10-31', año: 2024, mes: 10 },
    { nombre: 'Noviembre2', fecha: '2024-11-30', año: 2024, mes: 11 },
    { nombre: 'Diciembre3', fecha: '2024-12-31', año: 2024, mes: 12 },
    { nombre: 'Enero2', fecha: '2025-01-31', año: 2025, mes: 1 },
    { nombre: 'Febrero2', fecha: '2025-02-28', año: 2025, mes: 2 },
    { nombre: 'Marzo2', fecha: '2025-03-31', año: 2025, mes: 3 },
    { nombre: 'Abril2', fecha: '2025-04-30', año: 2025, mes: 4 },
    { nombre: 'Mayo2', fecha: '2025-05-31', año: 2025, mes: 5 },
    { nombre: 'Junio2', fecha: '2025-06-30', año: 2025, mes: 6 },
    { nombre: 'Julio3', fecha: '2025-07-31', año: 2025, mes: 7 }
];

function limpiarTexto(texto) {
    if (!texto || texto === null || texto === undefined) return null;
    return texto.toString().trim().replace(/\s+/g, ' ');
}

function convertirFechaExcel(fechaExcel) {
    if (!fechaExcel) return null;
    try {
        if (typeof fechaExcel === 'number') {
            const fecha = new Date((fechaExcel - 25569) * 86400 * 1000);
            return fecha.toISOString().split('T')[0];
        }
        if (fechaExcel instanceof Date) {
            return fechaExcel.toISOString().split('T')[0];
        }
        return null;
    } catch {
        return null;
    }
}

function determinarPrecio(tipoClase, domiciliado) {
    const tipo = (tipoClase || '').toLowerCase();
    if (domiciliado) {
        return tipo.includes('individual') || tipo.includes('i') ? 1800 : 1350;
    } else {
        return tipo.includes('individual') || tipo.includes('i') ? 1350 : 1500;
    }
}

function obtenerNombreMes(mes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes - 1];
}

// 🔍 VALIDAR DATOS ANTES DE INSERTAR
function validarTransaccion(data) {
    const errores = [];
    
    // Validar fecha
    if (!data.fecha) {
        errores.push('Fecha requerida');
    }
    
    // Validar concepto
    if (!data.concepto || data.concepto.trim() === '') {
        errores.push('Concepto requerido');
    }
    
    // Validar socio
    if (!data.socio || data.socio.trim() === '') {
        errores.push('Socio requerido');
    }
    
    // Validar cantidad > 0 (constraint 1)
    const cantidad = parseFloat(data.cantidad);
    if (isNaN(cantidad) || cantidad <= 0) {
        errores.push(`Cantidad debe ser > 0 (actual: ${data.cantidad})`);
    }
    
    // Validar precio_unitario >= 0 (constraint 2) - PERO LÓGICAMENTE DEBE SER > 0
    const precio = parseFloat(data.precio_unitario);
    if (isNaN(precio) || precio < 0) {
        errores.push(`Precio unitario debe ser >= 0 (actual: ${data.precio_unitario})`);
    }
    
    // Para efectos prácticos, también validar que precio > 0
    if (precio === 0) {
        errores.push(`Precio unitario es 0 - registro sin valor económico`);
    }
    
    // Validar empresa_id
    if (!data.empresa_id || ![1, 2].includes(data.empresa_id)) {
        errores.push(`Empresa ID inválida: ${data.empresa_id}`);
    }
    
    // Validar created_by
    if (!data.created_by || ![1, 2, 3, 4].includes(data.created_by)) {
        errores.push(`Created by inválido: ${data.created_by}`);
    }
    
    // Validar tipo
    if (!data.tipo || !['I', 'G'].includes(data.tipo)) {
        errores.push(`Tipo inválido: ${data.tipo}`);
    }
    
    return errores;
}

async function seedValidated() {
    console.log('🚀 SEED CON VALIDACIONES - INICIANDO\n');
    let paso = 1;
    let totalInsertados = 0;
    let totalRechazados = 0;
    
    try {
        console.log(`${paso++}. 🔗 Verificando conexión DB...`);
        const [test] = await executeQuery('SELECT 1 as test');
        console.log('✅ DB conectada');

        console.log(`${paso++}. 📁 Verificando archivo Excel...`);
        const excelPath = path.join(process.cwd(), EXCEL_FILE);
        if (!fs.existsSync(excelPath)) {
            throw new Error('Excel no encontrado');
        }
        console.log('✅ Excel encontrado');

        console.log(`${paso++}. 📊 Cargando Excel...`);
        const buffer = fs.readFileSync(excelPath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        console.log('✅ Excel cargado');

        console.log(`${paso++}. 📋 Verificando transacciones actuales...`);
        const [count] = await executeQuery('SELECT COUNT(*) as total FROM transacciones');
        console.log(`📊 Transacciones actuales: ${count.total}`);

        console.log(`${paso++}. 🧹 Limpiando transacciones existentes...`);
        if (count.total > 0) {
            await executeQuery('DELETE FROM transacciones WHERE 1=1');
            await executeQuery('ALTER TABLE transacciones AUTO_INCREMENT = 1');
            console.log('✅ Base limpia');
        }

        // PROCESAR INGRESOS SYMBIOT
        console.log(`\n${paso++}. 💰 Procesando Ingresos Symbiot...`);
        const ingresosSymbiot = workbook.Sheets['Ingresos Symbiot'];
        if (ingresosSymbiot) {
            const dataIngresos = XLSX.utils.sheet_to_json(ingresosSymbiot);
            let ingresosInsertados = 0;
            let ingresosRechazados = 0;
            
            for (const row of dataIngresos) {
                const data = {
                    fecha: convertirFechaExcel(row.Fecha),
                    concepto: limpiarTexto(row.Proyecto) || 'Proyecto Symbiot',
                    socio: 'Marco Delgado',
                    empresa_id: 2,
                    forma_pago: limpiarTexto(row['Tipo de pago']) || 'Transferencia',
                    cantidad: 1,
                    precio_unitario: parseFloat(row['Precio (MXN)']) || 0,
                    tipo: 'I',
                    created_by: 1
                };
                
                const errores = validarTransaccion(data);
                if (errores.length > 0) {
                    console.log(`   ⚠️ Rechazado: ${data.concepto} - ${errores.join(', ')}`);
                    ingresosRechazados++;
                    continue;
                }
                
                await executeQuery(`
                    INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [data.fecha, data.concepto, data.socio, data.empresa_id, data.forma_pago, data.cantidad, data.precio_unitario, data.tipo, data.created_by]);
                
                ingresosInsertados++;
                totalInsertados++;
            }
            console.log(`✅ ${ingresosInsertados} ingresos Symbiot insertados (${ingresosRechazados} rechazados)`);
            totalRechazados += ingresosRechazados;
        }

        // PROCESAR GASTOS SYMBIOT
        console.log(`${paso++}. 💸 Procesando Gastos Symbiot...`);
        const gastosSymbiot = workbook.Sheets['Gastos Symbiot'];
        if (gastosSymbiot) {
            const dataGastos = XLSX.utils.sheet_to_json(gastosSymbiot);
            let gastosInsertados = 0;
            let gastosRechazados = 0;
            
            for (const row of dataGastos) {
                const data = {
                    fecha: convertirFechaExcel(row.Fecha),
                    concepto: limpiarTexto(row.Concepto) || 'Gasto Symbiot',
                    socio: limpiarTexto(row.Socio) || 'Marco Delgado',
                    empresa_id: 2,
                    forma_pago: limpiarTexto(row['Forma de Pago']) || 'Efectivo',
                    cantidad: parseFloat(row.Cantidad) || 1,
                    precio_unitario: parseFloat(row['Precio x unidad']) || 0,
                    tipo: 'G',
                    created_by: 1
                };
                
                const errores = validarTransaccion(data);
                if (errores.length > 0) {
                    console.log(`   ⚠️ Rechazado: ${data.concepto} - ${errores.join(', ')}`);
                    gastosRechazados++;
                    continue;
                }
                
                await executeQuery(`
                    INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [data.fecha, data.concepto, data.socio, data.empresa_id, data.forma_pago, data.cantidad, data.precio_unitario, data.tipo, data.created_by]);
                
                gastosInsertados++;
                totalInsertados++;
            }
            console.log(`✅ ${gastosInsertados} gastos Symbiot insertados (${gastosRechazados} rechazados)`);
            totalRechazados += gastosRechazados;
        }

        // PROCESAR GASTOS ROCKSTAR SKULL CON VALIDACIÓN
        console.log(`${paso++}. 🎸💸 Procesando Gastos RockstarSkull (CON VALIDACIONES)...`);
        const gastosRockstar = workbook.Sheets['Gastos RockstarSkull'];
        if (gastosRockstar) {
            const dataGastosRockstar = XLSX.utils.sheet_to_json(gastosRockstar);
            let gastosInsertados = 0;
            let gastosRechazados = 0;
            
            console.log(`📊 ${dataGastosRockstar.length} gastos RockstarSkull encontrados`);
            
            for (let i = 0; i < dataGastosRockstar.length; i++) {
                const row = dataGastosRockstar[i];
                
                const data = {
                    fecha: convertirFechaExcel(row.Fecha),
                    concepto: limpiarTexto(row.Concepto) || 'Gasto Academia',
                    socio: limpiarTexto(row.Socio) || 'Antonio Razo',
                    empresa_id: 1,
                    forma_pago: limpiarTexto(row['Forma de Pago']) || 'Efectivo',
                    cantidad: parseFloat(row.Cantidad) || 1,
                    precio_unitario: parseFloat(row['Precio x unidad']) || 0,
                    tipo: 'G',
                    created_by: 2
                };
                
                const errores = validarTransaccion(data);
                if (errores.length > 0) {
                    if (gastosRechazados < 5) { // Solo mostrar primeros 5 errores
                        console.log(`   ⚠️ Fila ${i+1}: ${data.concepto} - ${errores.join(', ')}`);
                    }
                    gastosRechazados++;
                    continue;
                }
                
                await executeQuery(`
                    INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [data.fecha, data.concepto, data.socio, data.empresa_id, data.forma_pago, data.cantidad, data.precio_unitario, data.tipo, data.created_by]);
                
                gastosInsertados++;
                totalInsertados++;
                
                // Progress cada 100
                if (gastosInsertados % 100 === 0) {
                    console.log(`   📈 ${gastosInsertados} gastos válidos insertados...`);
                }
            }
            console.log(`✅ ${gastosInsertados} gastos RockstarSkull insertados`);
            console.log(`⚠️ ${gastosRechazados} gastos RockstarSkull rechazados por validación`);
            totalRechazados += gastosRechazados;
        }

        // PROCESAR INGRESOS ROCKSTAR SKULL
        console.log(`\n${paso++}. 🎸💰 PROCESANDO INGRESOS ROCKSTAR SKULL (MENSUALES)...`);
        const ingresosRockstar = workbook.Sheets['Ingresos RockstarSkull'];
        
        if (ingresosRockstar) {
            const data = XLSX.utils.sheet_to_json(ingresosRockstar, { header: 1 });
            const headers = data[0];
            
            console.log(`👥 ${data.length - 1} alumnos encontrados`);
            console.log(`📅 ${MESES_COLUMNAS.length} meses a procesar`);
            
            let transaccionesGeneradas = 0;
            let transaccionesRechazadas = 0;
            let alumnosConPagos = 0;
            
            for (let i = 1; i < data.length; i++) {
                const alumno = data[i];
                if (!alumno || !alumno[1]) continue;
                
                const nombreAlumno = limpiarTexto(alumno[1]);
                const maestro = limpiarTexto(alumno[3]) || 'Hugo Vázquez';
                const formaPago = limpiarTexto(alumno[10]) || 'Efectivo';
                const tipoClase = limpiarTexto(alumno[16]) || 'Grupal';
                const cantidad = parseInt(alumno[12]) || 1;
                
                const domiciliado = alumno[11] && 
                    alumno[11].toString().toLowerCase().includes('si');
                
                const precioUnitario = determinarPrecio(tipoClase, domiciliado);
                
                let pagosAlumno = 0;
                
                // Procesar cada mes
                for (const mesInfo of MESES_COLUMNAS) {
                    const columnaIndex = headers.findIndex(h => 
                        h && h.toString().trim() === mesInfo.nombre
                    );
                    
                    if (columnaIndex === -1) continue;
                    
                    const montoPagado = parseFloat(alumno[columnaIndex]) || 0;
                    
                    if (montoPagado > 0) {
                        const concepto = `${nombreAlumno} pago ${obtenerNombreMes(mesInfo.mes)} ${mesInfo.año}`;
                        
                        const dataIngreso = {
                            fecha: mesInfo.fecha,
                            concepto: concepto,
                            socio: maestro,
                            empresa_id: 1,
                            forma_pago: formaPago,
                            cantidad: cantidad,
                            precio_unitario: precioUnitario,
                            tipo: 'I',
                            created_by: 3
                        };
                        
                        const errores = validarTransaccion(dataIngreso);
                        if (errores.length > 0) {
                            if (transaccionesRechazadas < 5) { // Solo mostrar primeros 5
                                console.log(`   ⚠️ ${concepto} - ${errores.join(', ')}`);
                            }
                            transaccionesRechazadas++;
                            continue;
                        }
                        
                        await executeQuery(`
                            INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [dataIngreso.fecha, dataIngreso.concepto, dataIngreso.socio, dataIngreso.empresa_id, dataIngreso.forma_pago, dataIngreso.cantidad, dataIngreso.precio_unitario, dataIngreso.tipo, dataIngreso.created_by]);
                        
                        transaccionesGeneradas++;
                        totalInsertados++;
                        pagosAlumno++;
                    }
                }
                
                if (pagosAlumno > 0) {
                    alumnosConPagos++;
                }
                
                // Progress cada 20 alumnos
                if (i % 20 === 0) {
                    console.log(`   📈 ${i}/${data.length - 1} alumnos - ${transaccionesGeneradas} transacciones`);
                }
            }
            
            console.log(`✅ ${alumnosConPagos} alumnos con pagos procesados`);
            console.log(`✅ ${transaccionesGeneradas} transacciones de ingreso generadas`);
            if (transaccionesRechazadas > 0) {
                console.log(`⚠️ ${transaccionesRechazadas} transacciones rechazadas por validación`);
            }
            totalRechazados += transaccionesRechazadas;
        }

        // RESUMEN FINAL
        console.log(`\n${paso++}. 📊 RESUMEN FINAL...`);
        const [finalCount] = await executeQuery('SELECT COUNT(*) as total FROM transacciones');
        console.log(`📋 Total transacciones insertadas: ${finalCount.total}`);
        console.log(`✅ Registros válidos procesados: ${totalInsertados}`);
        console.log(`⚠️ Registros rechazados por validación: ${totalRechazados}`);

        const resumen = await executeQuery(`
            SELECT 
                e.nombre as empresa,
                t.tipo,
                COUNT(*) as cantidad,
                ROUND(SUM(t.cantidad * t.precio_unitario), 2) as monto
            FROM transacciones t
            JOIN empresas e ON t.empresa_id = e.id
            GROUP BY e.nombre, t.tipo
            ORDER BY e.nombre, t.tipo
        `);
        
        console.log('\n📈 RESUMEN POR EMPRESA:');
        resumen.forEach(row => {
            const tipo = row.tipo === 'I' ? '💰 Ingresos' : '💸 Gastos';
            const monto = new Intl.NumberFormat('es-MX', { 
                style: 'currency', 
                currency: 'MXN' 
            }).format(row.monto);
            console.log(`${row.empresa} - ${tipo}: ${row.cantidad} transacciones (${monto})`);
        });
        
        console.log('\n🎉 ¡SEED CON VALIDACIONES COMPLETADO!');
        console.log('🔗 Ver datos: http://localhost:3000/gastos');
        
        // Force exit success
        setTimeout(() => {
            console.log('🚪 Saliendo exitosamente...');
            process.exit(0);
        }, 2000);
        
    } catch (error) {
        console.error(`\n❌ ERROR EN PASO ${paso - 1}:`, error.message);
        console.error('📍 Stack:', error.stack);
        
        setTimeout(() => {
            console.log('🚪 Saliendo con error...');
            process.exit(1);
        }, 2000);
    }
}

console.log('🛡️ SEED CON VALIDACIONES INICIANDO...');
seedValidated();