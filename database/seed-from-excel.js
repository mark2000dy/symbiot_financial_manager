// ====================================================
// SCRIPT DE POBLACIÓN DE DATOS - SYMBIOT FINANCIAL MANAGER
// Archivo: database/seed-from-excel.js
// Poblar base de datos con datos reales de Excel
// ====================================================

import XLSX from 'xlsx';
import { executeQuery } from '../server/config/database.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Configuración
const EXCEL_FILE = 'Gastos Socios Symbiot.xlsx'; // Archivo en la raíz del proyecto

// 📊 Mapeo de empresas y usuarios
const EMPRESAS = {
    'Symbiot Technologies': { id: 2, created_by: 1 }, // Marco Delgado
    'Rockstar Skull': { id: 1, created_by: 2 }        // Antonio Razo
};

const USUARIOS_MAP = {
    'Marco Delgado': { id: 1, empresa_id: 2 },
    'Antonio Razo': { id: 2, empresa_id: 1 },
    'Hugo Vázquez': { id: 3, empresa_id: 1 },
    'Hugo Vazquez': { id: 3, empresa_id: 1 }, // Variación en el nombre
    'Escuela': { id: 4, empresa_id: 1 }
};

async function poblarBaseDeDatos() {
    console.log('🚀 INICIANDO POBLACIÓN DE BASE DE DATOS\n');
    
    try {
        // Verificar que el archivo Excel existe
        const excelPath = path.join(process.cwd(), EXCEL_FILE);
        if (!fs.existsSync(excelPath)) {
            throw new Error(`❌ Archivo Excel no encontrado: ${EXCEL_FILE}`);
        }
        
        console.log('✅ Archivo Excel encontrado:', excelPath);
        
        // Leer archivo Excel usando fs y XLSX.read
        const buffer = fs.readFileSync(excelPath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        console.log('📋 Hojas disponibles:', workbook.SheetNames);
        
        // Limpiar transacciones existentes
        await limpiarDatosExistentes();
        
        // Procesar cada hoja
        await procesarIngresosSymbiot(workbook);
        await procesarGastosSymbiot(workbook);
        await procesarIngresosRockstarSkull(workbook);
        await procesarGastosRockstarSkull(workbook);
        
        // Mostrar resumen final
        await mostrarResumenFinal();
        
        console.log('\n🎉 ¡POBLACIÓN DE DATOS COMPLETADA EXITOSAMENTE!');
        console.log('🔗 Ahora puedes ver los datos en: http://localhost:3000/gastos');
        
    } catch (error) {
        console.error('❌ Error en población de datos:', error.message);
        throw error;
    }
}

// 🧹 Limpiar datos existentes
async function limpiarDatosExistentes() {
    try {
        console.log('🧹 Limpiando transacciones existentes...');
        
        const result = await executeQuery('DELETE FROM transacciones WHERE 1=1');
        console.log(`✅ ${result.affectedRows || 0} transacciones eliminadas`);
        
    } catch (error) {
        console.error('⚠️ Error limpiando datos:', error.message);
        // No es crítico si no hay datos que limpiar
    }
}

// 💰 Procesar Ingresos de Symbiot Technologies
async function procesarIngresosSymbiot(workbook) {
    try {
        console.log('\n💰 PROCESANDO INGRESOS SYMBIOT TECHNOLOGIES...');
        
        const worksheet = workbook.Sheets['Ingresos Symbiot'];
        if (!worksheet) {
            console.log('⚠️ Hoja "Ingresos Symbiot" no encontrada');
            return;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        const ingresosValidos = data.filter(row => row.Fecha && row.Proyecto && row['Precio (MXN)'] > 0);
        
        console.log(`📊 Encontrados ${ingresosValidos.length} ingresos válidos`);
        
        let insertados = 0;
        
        for (const row of ingresosValidos) {
            try {
                const fecha = convertirFechaExcel(row.Fecha);
                const concepto = limpiarTexto(row.Proyecto) || 'Proyecto sin descripción';
                const precioMXN = parseFloat(row['Precio (MXN)']) || 0;
                const tipoPago = limpiarTexto(row['Tipo de pago']) || 'Transferencia';
                
                if (precioMXN <= 0) continue;
                
                const query = `
                    INSERT INTO transacciones (
                        fecha, concepto, socio, empresa_id, forma_pago, 
                        cantidad, precio_unitario, tipo, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                await executeQuery(query, [
                    fecha,
                    concepto,
                    'Marco Delgado', // Socio principal de Symbiot
                    2, // Symbiot Technologies
                    tipoPago,
                    1, // Cantidad
                    precioMXN, // Precio unitario
                    'I', // Ingreso
                    1  // Creado por Marco Delgado
                ]);
                
                insertados++;
                console.log(`✅ Ingreso insertado: ${concepto} - $${formatearPrecio(precioMXN)}`);
                
            } catch (error) {
                console.error('❌ Error insertando ingreso:', error.message);
            }
        }
        
        console.log(`📈 Total ingresos Symbiot insertados: ${insertados}`);
        
    } catch (error) {
        console.error('❌ Error procesando ingresos Symbiot:', error.message);
    }
}

// 💸 Procesar Gastos de Symbiot Technologies
async function procesarGastosSymbiot(workbook) {
    try {
        console.log('\n💸 PROCESANDO GASTOS SYMBIOT TECHNOLOGIES...');
        
        const worksheet = workbook.Sheets['Gastos Symbiot'];
        if (!worksheet) {
            console.log('⚠️ Hoja "Gastos Symbiot" no encontrada');
            return;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        const gastosValidos = data.filter(row => row.Fecha && row.Concepto && row.Total > 0);
        
        console.log(`📊 Encontrados ${gastosValidos.length} gastos válidos`);
        
        let insertados = 0;
        
        for (const row of gastosValidos) {
            try {
                const fecha = convertirFechaExcel(row.Fecha);
                const concepto = limpiarTexto(row.Concepto) || 'Gasto operativo';
                const socio = limpiarTexto(row.Socio) || 'Marco Delgado';
                const formaPago = limpiarTexto(row['Forma de Pago']) || 'Efectivo';
                const cantidad = parseFloat(row.Cantidad) || 1;
                const precioUnitario = parseFloat(row['Precio x unidad']) || 0;
                const total = parseFloat(row.Total) || 0;
                
                if (total <= 0) continue;
                
                // Mapear usuario
                const usuario = USUARIOS_MAP[socio] || USUARIOS_MAP['Marco Delgado'];
                
                const query = `
                    INSERT INTO transacciones (
                        fecha, concepto, socio, empresa_id, forma_pago, 
                        cantidad, precio_unitario, tipo, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                
                await executeQuery(query, [
                    fecha,
                    concepto,
                    socio,
                    2, // Symbiot Technologies
                    formaPago,
                    cantidad,
                    precioUnitario,
                    'G', // Gasto
                    usuario.id
                ]);
                
                insertados++;
                console.log(`✅ Gasto insertado: ${concepto} - $${formatearPrecio(total)}`);
                
            } catch (error) {
                console.error('❌ Error insertando gasto:', error.message);
            }
        }
        
        console.log(`📉 Total gastos Symbiot insertados: ${insertados}`);
        
    } catch (error) {
        console.error('❌ Error procesando gastos Symbiot:', error.message);
    }
}

// 🎸 Procesar Ingresos de RockstarSkull (Academia)
async function procesarIngresosRockstarSkull(workbook) {
    try {
        console.log('\n🎸 PROCESANDO INGRESOS ROCKSTAR SKULL...');
        
        const worksheet = workbook.Sheets['Ingresos RockstarSkull'];
        if (!worksheet) {
            console.log('⚠️ Hoja "Ingresos RockstarSkull" no encontrada');
            return;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        const alumnosValidos = data.filter(row => 
            row.Alumno && 
            row['Fecha de pago'] && 
            row.Total > 0
        );
        
        console.log(`📊 Encontrados ${alumnosValidos.length} alumnos válidos`);
        
        let insertados = 0;
        const mesesIngresos = ['Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 
                              'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];
        
        for (const row of alumnosValidos) {
            try {
                const alumno = limpiarTexto(row.Alumno);
                const maestro = limpiarTexto(row.Maestro) || 'Hugo Vázquez';
                const fechaBase = convertirFechaExcel(row['Fecha de pago']);
                const formaPago = limpiarTexto(row['Forma de Pago']) || 'Efectivo';
                const precioMensual = parseFloat(row['Precio x unidad']) || 1500;
                
                // Mapear maestro a usuario
                const usuario = USUARIOS_MAP[maestro] || USUARIOS_MAP['Antonio Razo'];
                
                // Crear ingresos mensuales basados en los pagos del alumno
                for (const mes of mesesIngresos) {
                    const pagoMes = parseFloat(row[mes]) || 0;
                    
                    if (pagoMes > 0) {
                        const fechaMes = ajustarFechaPorMes(fechaBase, mes);
                        
                        const query = `
                            INSERT INTO transacciones (
                                fecha, concepto, socio, empresa_id, forma_pago, 
                                cantidad, precio_unitario, tipo, created_by
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        
                        await executeQuery(query, [
                            fechaMes,
                            `Pago mensualidad guitarra - ${alumno}`,
                            maestro,
                            1, // Rockstar Skull
                            formaPago,
                            1, // Cantidad
                            pagoMes, // Precio unitario
                            'I', // Ingreso
                            usuario.id
                        ]);
                        
                        insertados++;
                        
                        if (insertados % 50 === 0) {
                            console.log(`📈 Procesados ${insertados} ingresos de alumnos...`);
                        }
                    }
                }
                
            } catch (error) {
                console.error('❌ Error insertando ingreso de alumno:', error.message);
            }
        }
        
        console.log(`🎵 Total ingresos RockstarSkull insertados: ${insertados}`);
        
    } catch (error) {
        console.error('❌ Error procesando ingresos RockstarSkull:', error.message);
    }
}

// 🎸💸 Procesar Gastos de RockstarSkull
async function procesarGastosRockstarSkull(workbook) {
    try {
        console.log('\n🎸💸 PROCESANDO GASTOS ROCKSTAR SKULL...');
        
        const worksheet = workbook.Sheets['Gastos RockstarSkull'];
        if (!worksheet) {
            console.log('⚠️ Hoja "Gastos RockstarSkull" no encontrada');
            return;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        const gastosValidos = data.filter(row => row.Fecha && row.Concepto && row.Total > 0);
        
        console.log(`📊 Encontrados ${gastosValidos.length} gastos válidos`);
        
        let insertados = 0;
        
        // Procesar en lotes para no sobrecargar
        for (let i = 0; i < gastosValidos.length; i += 50) {
            const lote = gastosValidos.slice(i, i + 50);
            
            for (const row of lote) {
                try {
                    const fecha = convertirFechaExcel(row.Fecha);
                    const concepto = limpiarTexto(row.Concepto) || 'Gasto operativo academia';
                    const socio = limpiarTexto(row.Socio) || 'Antonio Razo';
                    const formaPago = limpiarTexto(row['Forma de Pago']) || 'Efectivo';
                    const cantidad = parseFloat(row.Cantidad) || 1;
                    const precioUnitario = parseFloat(row['Precio x unidad']) || 0;
                    const total = parseFloat(row.Total) || 0;
                    
                    if (total <= 0) continue;
                    
                    // Mapear usuario
                    const usuario = USUARIOS_MAP[socio] || USUARIOS_MAP['Antonio Razo'];
                    
                    const query = `
                        INSERT INTO transacciones (
                            fecha, concepto, socio, empresa_id, forma_pago, 
                            cantidad, precio_unitario, tipo, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    await executeQuery(query, [
                        fecha,
                        concepto,
                        socio,
                        1, // Rockstar Skull
                        formaPago,
                        cantidad,
                        precioUnitario,
                        'G', // Gasto
                        usuario.id
                    ]);
                    
                    insertados++;
                    
                } catch (error) {
                    console.error('❌ Error insertando gasto RockstarSkull:', error.message);
                }
            }
            
            console.log(`🎸 Procesados ${Math.min(i + 50, gastosValidos.length)} de ${gastosValidos.length} gastos...`);
        }
        
        console.log(`🎵 Total gastos RockstarSkull insertados: ${insertados}`);
        
    } catch (error) {
        console.error('❌ Error procesando gastos RockstarSkull:', error.message);
    }
}

// 📊 Mostrar resumen final
async function mostrarResumenFinal() {
    try {
        console.log('\n📊 RESUMEN FINAL DE DATOS INSERTADOS:');
        
        // Contar por empresa y tipo
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
        
        console.log('\n📈 POR EMPRESA Y TIPO:');
        resumen.forEach(row => {
            const tipo = row.tipo === 'I' ? '💰 Ingresos' : '💸 Gastos';
            console.log(`${row.empresa} - ${tipo}: ${row.cantidad} transacciones, $${formatearPrecio(row.total_monto)}`);
        });
        
        // Balance por empresa
        const balance = await executeQuery(`
            SELECT 
                e.nombre as empresa,
                ROUND(
                    SUM(CASE WHEN t.tipo = 'I' THEN t.total ELSE 0 END) - 
                    SUM(CASE WHEN t.tipo = 'G' THEN t.total ELSE 0 END), 2
                ) as balance
            FROM transacciones t
            JOIN empresas e ON t.empresa_id = e.id
            GROUP BY e.nombre
            ORDER BY e.nombre
        `);
        
        console.log('\n💼 BALANCE POR EMPRESA:');
        balance.forEach(row => {
            const color = row.balance >= 0 ? '✅' : '❌';
            console.log(`${color} ${row.empresa}: $${formatearPrecio(row.balance)}`);
        });
        
        // Total general
        const totales = await executeQuery(`
            SELECT 
                COUNT(*) as total_transacciones,
                ROUND(SUM(CASE WHEN tipo = 'I' THEN total ELSE 0 END), 2) as total_ingresos,
                ROUND(SUM(CASE WHEN tipo = 'G' THEN total ELSE 0 END), 2) as total_gastos,
                ROUND(
                    SUM(CASE WHEN tipo = 'I' THEN total ELSE 0 END) - 
                    SUM(CASE WHEN tipo = 'G' THEN total ELSE 0 END), 2
                ) as balance_general
            FROM transacciones
        `);
        
        console.log('\n🏆 TOTALES GENERALES:');
        const total = totales[0];
        console.log(`📊 Transacciones: ${total.total_transacciones}`);
        console.log(`💰 Ingresos: $${formatearPrecio(total.total_ingresos)}`);
        console.log(`💸 Gastos: $${formatearPrecio(total.total_gastos)}`);
        console.log(`💼 Balance: $${formatearPrecio(total.balance_general)}`);
        
    } catch (error) {
        console.error('❌ Error generando resumen:', error.message);
    }
}

// 🛠️ FUNCIONES UTILITARIAS

// Convertir fecha serial de Excel a fecha SQL
function convertirFechaExcel(fechaExcel) {
    if (!fechaExcel) return '2024-01-01';
    
    // Si ya es una fecha, convertirla
    if (fechaExcel instanceof Date) {
        return fechaExcel.toISOString().split('T')[0];
    }
    
    // Si es un número serial de Excel
    if (typeof fechaExcel === 'number') {
        // Excel usa 1 de enero de 1900 como día 1
        const fechaBase = new Date(1900, 0, 1);
        const fechaConvertida = new Date(fechaBase.getTime() + (fechaExcel - 2) * 24 * 60 * 60 * 1000);
        return fechaConvertida.toISOString().split('T')[0];
    }
    
    // Si es string, intentar parsear
    if (typeof fechaExcel === 'string') {
        const fecha = new Date(fechaExcel);
        if (!isNaN(fecha.getTime())) {
            return fecha.toISOString().split('T')[0];
        }
    }
    
    // Fallback
    return '2024-01-01';
}

// Ajustar fecha por mes
function ajustarFechaPorMes(fechaBase, mes) {
    const meses = {
        'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9,
        'Noviembre': 10, 'Diciembre': 11, 'Enero': 0, 'Febrero': 1,
        'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5
    };
    
    const fecha = new Date(fechaBase);
    fecha.setMonth(meses[mes] || fecha.getMonth());
    
    return fecha.toISOString().split('T')[0];
}

// Limpiar texto
function limpiarTexto(texto) {
    if (!texto) return '';
    return texto.toString().trim().replace(/\s+/g, ' ');
}

// Formatear precio
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(precio);
}

// 🚀 Ejecutar script
if (import.meta.url === `file://${process.argv[1]}`) {
    poblarBaseDeDatos()
        .then(() => {
            console.log('\n✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Script falló:', error);
            process.exit(1);
        });
}

export { poblarBaseDeDatos };