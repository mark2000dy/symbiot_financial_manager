// ====================================================
// SCRIPT COMPLETO DE POBLACIÓN DESDE EXCEL - VERSIÓN CORREGIDA
// Archivo: database/seed-from-excel.js  
// Basado en diagnóstico exitoso - Headers reales del Excel
// ====================================================

import XLSX from 'xlsx';
import { executeQuery } from '../server/config/database.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Configuración
const EXCEL_FILE = 'Gastos Socios Symbiot.xlsx';
const BATCH_SIZE = 25; // Procesar en lotes más pequeños

// 📊 Mapeos de referencia (según diagnóstico)
const USUARIOS_MAP = {
    'Marco Delgado': { id: 1, empresa_id: 2 },
    'Antonio Razo': { id: 2, empresa_id: 1 },
    'Hugo Vázquez': { id: 3, empresa_id: 1 },
    'Hugo Vazquez': { id: 3, empresa_id: 1 },
    'Escuela': { id: 4, empresa_id: 1 },
    'Julio Olvera': { id: 3, empresa_id: 1 }, // Mapear a Hugo por default
    'Irwin': { id: 3, empresa_id: 1 },
    'Manuel Reyes': { id: 3, empresa_id: 1 },
    'Luis Blanquet': { id: 3, empresa_id: 1 },
    'Nahomy Perez': { id: 3, empresa_id: 1 },
    'Demian Andrade': { id: 3, empresa_id: 1 }
};

// 📅 Mapeo exacto de columnas según diagnóstico
const COLUMNAS_MESES = [
    { nombre: 'Julio', año: 2023, mes: 7, fecha: '2023-07-31' },
    { nombre: 'Agosto', año: 2023, mes: 8, fecha: '2023-08-31' },
    { nombre: 'Septiembre', año: 2023, mes: 9, fecha: '2023-09-30' },
    { nombre: 'Octubre', año: 2023, mes: 10, fecha: '2023-10-31' },
    { nombre: 'Noviembre', año: 2023, mes: 11, fecha: '2023-11-30' },
    { nombre: 'Diciembre', año: 2023, mes: 12, fecha: '2023-12-31' },
    { nombre: 'Enero', año: 2024, mes: 1, fecha: '2024-01-31' },
    { nombre: 'Febrero', año: 2024, mes: 2, fecha: '2024-02-29' },
    { nombre: 'Marzo', año: 2024, mes: 3, fecha: '2024-03-31' },
    { nombre: 'Abril', año: 2024, mes: 4, fecha: '2024-04-30' },
    { nombre: 'Mayo', año: 2024, mes: 5, fecha: '2024-05-31' },
    { nombre: 'Junio', año: 2024, mes: 6, fecha: '2024-06-30' },
    { nombre: 'Julio2', año: 2024, mes: 7, fecha: '2024-07-31' },
    { nombre: 'Agosto2', año: 2024, mes: 8, fecha: '2024-08-31' },
    { nombre: 'Septiembre2', año: 2024, mes: 9, fecha: '2024-09-30' },
    { nombre: 'Octubre2', año: 2024, mes: 10, fecha: '2024-10-31' },
    { nombre: 'Noviembre2', año: 2024, mes: 11, fecha: '2024-11-30' },
    { nombre: 'Diciembre3', año: 2024, mes: 12, fecha: '2024-12-31' },
    { nombre: 'Enero2', año: 2025, mes: 1, fecha: '2025-01-31' },
    { nombre: 'Febrero2', año: 2025, mes: 2, fecha: '2025-02-28' },
    { nombre: 'Marzo2', año: 2025, mes: 3, fecha: '2025-03-31' },
    { nombre: 'Abril2', año: 2025, mes: 4, fecha: '2025-04-30' },
    { nombre: 'Mayo2', año: 2025, mes: 5, fecha: '2025-05-31' },
    { nombre: 'Junio2', año: 2025, mes: 6, fecha: '2025-06-30' },
    { nombre: 'Julio3', año: 2025, mes: 7, fecha: '2025-07-31' }
];

// 🧩 Funciones utilitarias
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
        
        if (fechaExcel instanceof Date && !isNaN(fechaExcel.getTime())) {
            return fechaExcel.toISOString().split('T')[0];
        }
        
        if (typeof fechaExcel === 'string') {
            const fecha = new Date(fechaExcel);
            if (!isNaN(fecha.getTime())) {
                return fecha.toISOString().split('T')[0];
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error convirtiendo fecha:', fechaExcel, error.message);
        return null;
    }
}

function determinarPrecioUnitario(tipoClase, domiciliado) {
    const tipo = (tipoClase || '').toLowerCase();
    
    if (domiciliado) {
        return tipo.includes('individual') || tipo.includes('i') ? 1800 : 1350;
    } else {
        return tipo.includes('individual') || tipo.includes('i') ? 1350 : 1500;
    }
}

function obtenerNombreMes(año, mes) {
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1];
}

// 🚀 Función principal
async function poblarBaseDeDatos() {
    console.log('🚀 INICIANDO POBLACIÓN COMPLETA DE BASE DE DATOS\n');
    
    try {
        console.log('📁 Verificando archivo Excel...');
        const excelPath = path.join(process.cwd(), EXCEL_FILE);
        
        if (!fs.existsSync(excelPath)) {
            throw new Error(`❌ Archivo Excel no encontrado: ${EXCEL_FILE}`);
        }
        console.log('✅ Archivo encontrado');
        
        console.log('📊 Leyendo archivo Excel...');
        const buffer = fs.readFileSync(excelPath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        console.log('✅ Excel leído exitosamente');
        
        // Verificar transacciones existentes ANTES de limpiar
        console.log('\n📊 Verificando estado actual de la base...');
        const [currentCount] = await executeQuery('SELECT COUNT(*) as total FROM transacciones');
        console.log(`📋 Transacciones actuales: ${currentCount.total}`);
        
        if (currentCount.total > 0) {
            console.log('⚠️ ATENCIÓN: Ya existen transacciones en la base');
            console.log('🧹 Limpiando para nueva población...');
            await executeQuery('DELETE FROM transacciones WHERE 1=1');
            await executeQuery('ALTER TABLE transacciones AUTO_INCREMENT = 1');
            console.log('✅ Base de datos limpia');
        }
        
        console.log('\n📈 Iniciando procesamiento de datos...');
        
        // Procesar en orden optimizado
        await procesarIngresosSymbiot(workbook);
        await procesarGastosSymbiot(workbook);
        await procesarGastosRockstarSkull(workbook);
        
        // La función principal - generar ingresos mensuales
        await procesarIngresosRockstarSkull(workbook);
        
        await mostrarResumenFinal();
        
        console.log('\n🎉 ¡POBLACIÓN COMPLETA EXITOSA!');
        console.log('🔗 Ver resultados: http://localhost:3000/gastos');
        
    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error.message);
        console.error('📍 Stack:', error.stack);
        throw error;
    }
}

// 💰 Procesar Ingresos Symbiot (simplificado)
async function procesarIngresosSymbiot(workbook) {
    try {
        console.log('\n💰 Procesando ingresos Symbiot...');
        const worksheet = workbook.Sheets['Ingresos Symbiot'];
        if (!worksheet) {
            console.log('⚠️ Hoja no encontrada');
            return;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        const validos = data.filter(row => row.Fecha && row.Proyecto && row['Precio (MXN)'] > 0);
        console.log(`📊 ${validos.length} ingresos válidos`);
        
        for (const row of validos) {
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
                parseFloat(row['Precio (MXN)']) || 0,
                'I',
                1
            ]);
        }
        
        console.log(`✅ ${validos.length} ingresos Symbiot insertados`);
    } catch (error) {
        console.error('❌ Error en ingresos Symbiot:', error.message);
    }
}

// 💸 Procesar Gastos Symbiot (simplificado)
async function procesarGastosSymbiot(workbook) {
    try {
        console.log('\n💸 Procesando gastos Symbiot...');
        const worksheet = workbook.Sheets['Gastos Symbiot'];
        if (!worksheet) {
            console.log('⚠️ Hoja no encontrada');
            return;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        const validos = data.filter(row => row.Fecha && row.Concepto && row.Total > 0);
        console.log(`📊 ${validos.length} gastos válidos`);
        
        for (const row of validos) {
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
        }
        
        console.log(`✅ ${validos.length} gastos Symbiot insertados`);
    } catch (error) {
        console.error('❌ Error en gastos Symbiot:', error.message);
    }
}

// 🎸💸 Procesar Gastos RockstarSkull (optimizado)
async function procesarGastosRockstarSkull(workbook) {
    try {
        console.log('\n🎸💸 Procesando gastos RockstarSkull...');
        const worksheet = workbook.Sheets['Gastos RockstarSkull'];
        if (!worksheet) {
            console.log('⚠️ Hoja no encontrada');
            return;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        const validos = data.filter(row => row.Fecha && row.Concepto && row.Total > 0);
        console.log(`📊 ${validos.length} gastos válidos - procesando en lotes...`);
        
        let insertados = 0;
        for (let i = 0; i < validos.length; i += BATCH_SIZE) {
            const lote = validos.slice(i, i + BATCH_SIZE);
            
            for (const row of lote) {
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
                insertados++;
            }
            
            console.log(`   📈 Procesados ${Math.min(i + BATCH_SIZE, validos.length)} de ${validos.length} gastos...`);
        }
        
        console.log(`✅ ${insertados} gastos RockstarSkull insertados`);
    } catch (error) {
        console.error('❌ Error en gastos RockstarSkull:', error.message);
    }
}

// 🎸💰 Procesar Ingresos RockstarSkull (FUNCIÓN PRINCIPAL MEJORADA)
async function procesarIngresosRockstarSkull(workbook) {
    try {
        console.log('\n🎸💰 PROCESANDO INGRESOS ROCKSTAR SKULL...');
        console.log('📊 Generando transacciones mensuales por alumno...');
        
        const worksheet = workbook.Sheets['Ingresos RockstarSkull'];
        if (!worksheet) {
            console.log('⚠️ Hoja "Ingresos RockstarSkull" no encontrada');
            return;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const headers = data[0];
        
        console.log(`👥 Total alumnos encontrados: ${data.length - 1}`);
        console.log(`📅 Meses a procesar: ${COLUMNAS_MESES.length} (Julio 2023 - Julio 2025)`);
        
        let transaccionesGeneradas = 0;
        let alumnosConPagos = 0;
        
        // Procesar cada alumno
        for (let i = 1; i < data.length; i++) {
            const alumnoData = data[i];
            if (!alumnoData || !alumnoData[1]) continue; // Sin nombre
            
            try {
                const nombreAlumno = limpiarTexto(alumnoData[1]);
                const maestro = limpiarTexto(alumnoData[3]) || 'Hugo Vázquez';
                const formaPago = limpiarTexto(alumnoData[10]) || 'Efectivo'; // Columna K
                const tipoClase = limpiarTexto(alumnoData[16]) || 'Grupal'; // "Tipo de Clase"
                const cantidad = parseInt(alumnoData[12]) || 1; // "Cantidad"
                
                // Determinar si está domiciliado (columna L = index 11)
                const domiciliadoValue = alumnoData[11];
                const domiciliado = domiciliadoValue && 
                    domiciliadoValue.toString().toLowerCase().includes('si');
                
                // Calcular precio según reglas
                const precioUnitario = determinarPrecioUnitario(tipoClase, domiciliado);
                
                let pagosAlumno = 0;
                
                // Procesar cada mes
                for (const mesInfo of COLUMNAS_MESES) {
                    // Buscar columna del mes
                    const columnaIndex = headers.findIndex(h => 
                        h && h.toString().trim() === mesInfo.nombre
                    );
                    
                    if (columnaIndex === -1) continue;
                    
                    const montoPagado = parseFloat(alumnoData[columnaIndex]) || 0;
                    
                    if (montoPagado > 0) {
                        // Generar transacción
                        const concepto = `${nombreAlumno} pago ${obtenerNombreMes(mesInfo.año, mesInfo.mes)} ${mesInfo.año}`;
                        
                        await executeQuery(`
                            INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            mesInfo.fecha,
                            concepto,
                            maestro,
                            1, // Rockstar Skull
                            formaPago,
                            cantidad,
                            precioUnitario,
                            'I',
                            3 // Hugo Vázquez
                        ]);
                        
                        transaccionesGeneradas++;
                        pagosAlumno++;
                    }
                }
                
                if (pagosAlumno > 0) {
                    alumnosConPagos++;
                    console.log(`   ✅ ${nombreAlumno}: ${pagosAlumno} pagos mensuales`);
                }
                
                // Progress cada 20 alumnos
                if (i % 20 === 0) {
                    console.log(`📈 Progreso: ${i}/${data.length - 1} alumnos - ${transaccionesGeneradas} transacciones`);
                }
                
            } catch (error) {
                console.error(`❌ Error procesando alumno en fila ${i}:`, error.message);
            }
        }
        
        console.log(`\n🎓 RESUMEN INGRESOS ROCKSTAR SKULL:`);
        console.log(`👥 Alumnos con pagos: ${alumnosConPagos} de ${data.length - 1}`);
        console.log(`💰 Transacciones generadas: ${transaccionesGeneradas}`);
        
    } catch (error) {
        console.error('❌ Error procesando ingresos RockstarSkull:', error.message);
        throw error;
    }
}

// 📊 Mostrar resumen final
async function mostrarResumenFinal() {
    try {
        console.log('\n📊 RESUMEN FINAL:');
        
        const [total] = await executeQuery('SELECT COUNT(*) as total FROM transacciones');
        console.log(`📋 Total transacciones: ${total.total}`);
        
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
        
        resumen.forEach(row => {
            const tipo = row.tipo === 'I' ? '💰 Ingresos' : '💸 Gastos';
            const monto = new Intl.NumberFormat('es-MX', { 
                style: 'currency', 
                currency: 'MXN' 
            }).format(row.monto);
            console.log(`${row.empresa} - ${tipo}: ${row.cantidad} transacciones (${monto})`);
        });
        
    } catch (error) {
        console.error('❌ Error en resumen:', error.message);
    }
}

// Exportar función principal
export { poblarBaseDeDatos };

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🌱 EJECUTANDO SEED DIRECTO...');
    
    poblarBaseDeDatos()
        .then(() => {
            console.log('\n✅ ¡SEED COMPLETADO!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ ERROR EN SEED:', error.message);
            process.exit(1);
        });
}