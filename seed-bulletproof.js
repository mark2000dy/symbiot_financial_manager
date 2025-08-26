// ====================================================
// SCRIPT BULLETPROOF - POBLACIÓN DESDE EXCEL
// Archivo: seed-bulletproof.js (crear en la raíz)
// Basado en debug exitoso - VERSIÓN INFALIBLE
// ====================================================

import { executeQuery } from './server/config/database.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const EXCEL_FILE = 'Gastos Socios Symbiot.xlsx';

// ⏰ TIMEOUT DE SEGURIDAD - 10 minutos máximo
const TIMEOUT_MS = 10 * 60 * 1000;
setTimeout(() => {
    console.log('\n⏰ TIMEOUT - Script tardó demasiado');
    console.log('🚪 Forzando salida...');
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
    if (!texto) return null;
    return texto.toString().trim();
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

async function seedBulletproof() {
    console.log('🚀 SEED BULLETPROOF - INICIANDO\n');
    let paso = 1;
    
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
            
            for (const row of dataIngresos) {
                if (!row.Fecha || !row.Proyecto || !row['Precio (MXN)']) continue;
                
                const fecha = convertirFechaExcel(row.Fecha);
                if (!fecha) continue;
                
                await executeQuery(`
                    INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    fecha,
                    limpiarTexto(row.Proyecto) || 'Proyecto Symbiot',
                    'Marco Delgado',
                    2,
                    limpiarTexto(row['Tipo de pago']) || 'Transferencia',
                    1,
                    parseFloat(row['Precio (MXN)']),
                    'I',
                    1
                ]);
                ingresosInsertados++;
            }
            console.log(`✅ ${ingresosInsertados} ingresos Symbiot insertados`);
        }

        // PROCESAR GASTOS SYMBIOT
        console.log(`${paso++}. 💸 Procesando Gastos Symbiot...`);
        const gastosSymbiot = workbook.Sheets['Gastos Symbiot'];
        if (gastosSymbiot) {
            const dataGastos = XLSX.utils.sheet_to_json(gastosSymbiot);
            let gastosInsertados = 0;
            
            for (const row of dataGastos) {
                if (!row.Fecha || !row.Concepto || !row.Total) continue;
                
                const fecha = convertirFechaExcel(row.Fecha);
                if (!fecha) continue;
                
                await executeQuery(`
                    INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    fecha,
                    limpiarTexto(row.Concepto) || 'Gasto Symbiot',
                    limpiarTexto(row.Socio) || 'Marco Delgado',
                    2,
                    limpiarTexto(row['Forma de Pago']) || 'Efectivo',
                    parseFloat(row.Cantidad) || 1,
                    parseFloat(row['Precio x unidad']) || 0,
                    'G',
                    1
                ]);
                gastosInsertados++;
            }
            console.log(`✅ ${gastosInsertados} gastos Symbiot insertados`);
        }

        // PROCESAR GASTOS ROCKSTAR SKULL
        console.log(`${paso++}. 🎸💸 Procesando Gastos RockstarSkull...`);
        const gastosRockstar = workbook.Sheets['Gastos RockstarSkull'];
        if (gastosRockstar) {
            const dataGastosRockstar = XLSX.utils.sheet_to_json(gastosRockstar);
            let gastosRockstarInsertados = 0;
            
            console.log(`📊 ${dataGastosRockstar.length} gastos RockstarSkull encontrados`);
            
            for (let i = 0; i < dataGastosRockstar.length; i++) {
                const row = dataGastosRockstar[i];
                
                if (!row.Fecha || !row.Concepto || !row.Total) continue;
                
                const fecha = convertirFechaExcel(row.Fecha);
                if (!fecha) continue;
                
                await executeQuery(`
                    INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    fecha,
                    limpiarTexto(row.Concepto) || 'Gasto Academia',
                    limpiarTexto(row.Socio) || 'Antonio Razo',
                    1,
                    limpiarTexto(row['Forma de Pago']) || 'Efectivo',
                    parseFloat(row.Cantidad) || 1,
                    parseFloat(row['Precio x unidad']) || 0,
                    'G',
                    2
                ]);
                
                gastosRockstarInsertados++;
                
                // Progress cada 100
                if (gastosRockstarInsertados % 100 === 0) {
                    console.log(`   📈 ${gastosRockstarInsertados} gastos procesados...`);
                }
            }
            console.log(`✅ ${gastosRockstarInsertados} gastos RockstarSkull insertados`);
        }

        // PROCESAR INGRESOS ROCKSTAR SKULL (PRINCIPAL)
        console.log(`\n${paso++}. 🎸💰 PROCESANDO INGRESOS ROCKSTAR SKULL (MENSUALES)...`);
        const ingresosRockstar = workbook.Sheets['Ingresos RockstarSkull'];
        
        if (ingresosRockstar) {
            const data = XLSX.utils.sheet_to_json(ingresosRockstar, { header: 1 });
            const headers = data[0];
            
            console.log(`👥 ${data.length - 1} alumnos encontrados`);
            console.log(`📅 ${MESES_COLUMNAS.length} meses a procesar`);
            
            let transaccionesGeneradas = 0;
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
                        
                        await executeQuery(`
                            INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            mesInfo.fecha,
                            concepto,
                            maestro,
                            1,
                            formaPago,
                            cantidad,
                            precioUnitario,
                            'I',
                            3
                        ]);
                        
                        transaccionesGeneradas++;
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
        }

        // RESUMEN FINAL
        console.log(`\n${paso++}. 📊 RESUMEN FINAL...`);
        const [finalCount] = await executeQuery('SELECT COUNT(*) as total FROM transacciones');
        console.log(`📋 Total transacciones finales: ${finalCount.total}`);

        const resumen = await executeQuery(`
            SELECT 
                e.nombre as empresa,
                t.tipo,
                COUNT(*) as cantidad
            FROM transacciones t
            JOIN empresas e ON t.empresa_id = e.id
            GROUP BY e.nombre, t.tipo
            ORDER BY e.nombre, t.tipo
        `);
        
        console.log('\n📈 RESUMEN POR EMPRESA:');
        resumen.forEach(row => {
            const tipo = row.tipo === 'I' ? '💰 Ingresos' : '💸 Gastos';
            console.log(`${row.empresa} - ${tipo}: ${row.cantidad} transacciones`);
        });
        
        console.log('\n🎉 ¡SEED BULLETPROOF COMPLETADO EXITOSAMENTE!');
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

console.log('🌱 SEED BULLETPROOF INICIANDO...');
seedBulletproof();