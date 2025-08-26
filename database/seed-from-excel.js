// ====================================================
// SCRIPT DE POBLACIÓN DESDE EXCEL REAL
// Archivo: database/seed-from-excel.js  
// Procesar "Gastos Socios Symbiot.xlsx" con nueva estructura
// ====================================================

import XLSX from 'xlsx';
import { executeQuery } from '../server/config/database.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Configuración
const EXCEL_FILE = 'Gastos Socios Symbiot.xlsx';

// 📊 Mapeos de referencia
const EMPRESAS = {
    'Symbiot Technologies': { id: 2, created_by: 1 },
    'Rockstar Skull': { id: 1, created_by: 3 }
};

const USUARIOS_MAP = {
    'Marco Delgado': { id: 1, empresa_id: 2 },
    'Antonio Razo': { id: 2, empresa_id: 2 },
    'Hugo Vazquez': { id: 3, empresa_id: 1 },
    'Hugo Vázquez': { id: 3, empresa_id: 1 }, // Variación con acento
    'Escuela': { id: 4, empresa_id: 1 }
};

const MAESTROS_MAP = {
    'Hugo Vazquez': 1,
    'Hugo Vázquez': 1,
    'Julio': 2,
    'Demian': 3,
    'Irwin': 4,
    'Nahomy': 5,
    'Luis': 6,
    'Manuel': 7,
    'Harim López': 8
};

// Mapeo de meses (desde julio 2023 hasta julio 2025)
const MESES_MAP = {
    // 2023
    'Julio': { año: 2023, mes: 7 },
    'Agosto': { año: 2023, mes: 8 },
    'Septiembre': { año: 2023, mes: 9 },
    'Octubre': { año: 2023, mes: 10 },
    'Noviembre': { año: 2023, mes: 11 },
    'Diciembre': { año: 2023, mes: 12 },
    // 2024
    'Enero': { año: 2024, mes: 1 },
    'Febrero': { año: 2024, mes: 2 },
    'Marzo': { año: 2024, mes: 3 },
    'Abril': { año: 2024, mes: 4 },
    'Mayo': { año: 2024, mes: 5 },
    'Junio': { año: 2024, mes: 6 },
    'Julio.1': { año: 2024, mes: 7 },
    'Agosto.1': { año: 2024, mes: 8 },
    'Septiembre.1': { año: 2024, mes: 9 },
    'Octubre.1': { año: 2024, mes: 10 },
    'Noviembre.1': { año: 2024, mes: 11 },
    'Diciembre.1': { año: 2024, mes: 12 },
    // 2025
    'Enero.1': { año: 2025, mes: 1 },
    'Febrero.1': { año: 2025, mes: 2 },
    'Marzo.1': { año: 2025, mes: 3 },
    'Abril.1': { año: 2025, mes: 4 },
    'Mayo.1': { año: 2025, mes: 5 },
    'Junio.1': { año: 2025, mes: 6 },
    'Julio.2': { año: 2025, mes: 7 }
};

// 🧩 Funciones utilitarias
function limpiarTexto(texto) {
    if (!texto || texto === null || texto === undefined) return '';
    return String(texto).trim().replace(/\s+/g, ' ');
}

function convertirFechaExcel(fechaExcel) {
    if (!fechaExcel) return null;
    
    if (typeof fechaExcel === 'number') {
        // Fecha en formato numérico de Excel
        const fecha = XLSX.SSF.parse_date_code(fechaExcel);
        return `${fecha.y}-${String(fecha.m).padStart(2, '0')}-${String(fecha.d).padStart(2, '0')}`;
    }
    
    if (typeof fechaExcel === 'string') {
        // Intentar parsear string de fecha
        const fecha = new Date(fechaExcel);
        if (!isNaN(fecha.getTime())) {
            return fecha.toISOString().split('T')[0];
        }
    }
    
    return null;
}

function calcularPrecioMensual(tipoClase, domiciliado, promocion = '') {
    const promocionLower = (promocion || '').toLowerCase();
    
    if (promocionLower.includes('becado') || promocionLower.includes('staff')) {
        return 0;
    }
    
    if (promocionLower.includes('dos clases') || promocionLower.includes('doble')) {
        return 1275;
    }
    
    if (tipoClase === 'Individual') {
        return domiciliado ? 1800 : 2000;
    } else {
        return domiciliado ? 1350 : 1500;
    }
}

function crearFechaPago(fechaInscripcion, año, mes) {
    const fechaBase = new Date(fechaInscripcion);
    const dia = fechaBase.getDate();
    
    // Crear fecha de pago para el mes/año especificado
    const fechaPago = new Date(año, mes - 1, dia);
    return fechaPago.toISOString().split('T')[0];
}

// 🚀 Función principal
async function poblarBaseDeDatos() {
    console.log('🚀 INICIANDO POBLACIÓN DESDE EXCEL REAL\n');
    
    try {
        // Verificar archivo Excel
        const excelPath = path.join(process.cwd(), EXCEL_FILE);
        if (!fs.existsSync(excelPath)) {
            throw new Error(`❌ Archivo Excel no encontrado: ${EXCEL_FILE}`);
        }
        
        console.log('✅ Archivo Excel encontrado:', excelPath);
        
        // Leer Excel
        const buffer = fs.readFileSync(excelPath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        console.log('📋 Hojas disponibles:', workbook.SheetNames);
        
        // Limpiar datos existentes
        await limpiarDatosExistentes();
        
        // Insertar datos maestros
        await insertarDatosMaestros();
        
        // Procesar cada hoja del Excel
        await procesarIngresosSymbiot(workbook);
        await procesarGastosSymbiot(workbook);
        await procesarIngresosRockstarSkull(workbook);
        await procesarGastosRockstarSkull(workbook);
        
        // Mostrar resumen
        await mostrarResumenFinal();
        
        console.log('\n🎉 ¡POBLACIÓN DESDE EXCEL COMPLETADA EXITOSAMENTE!');
        console.log('🔗 Dashboard disponible en: http://localhost:3000/gastos');
        
    } catch (error) {
        console.error('❌ Error poblando desde Excel:', error.message);
        throw error;
    }
}

// 🧹 Limpiar datos existentes
async function limpiarDatosExistentes() {
    console.log('\n🧹 Limpiando datos existentes...');
    
    const tables = ['transacciones', 'pagos_mensuales', 'alumnos', 'staff', 'maestros', 'usuarios', 'empresas'];
    
    for (const table of tables) {
        try {
            const result = await executeQuery(`DELETE FROM ${table}`);
            console.log(`✅ Tabla ${table} limpiada (${result.affectedRows || 0} registros)`);
        } catch (error) {
            console.log(`⚠️ Advertencia limpiando ${table}: ${error.message}`);
        }
    }
}

// 📋 Insertar datos maestros
async function insertarDatosMaestros() {
    console.log('\n📋 Insertando datos maestros...');
    
    // Empresas
    await executeQuery('INSERT INTO empresas (id, nombre, tipo_negocio) VALUES (?, ?, ?)', [1, 'Rockstar Skull', 'Academia de Música']);
    await executeQuery('INSERT INTO empresas (id, nombre, tipo_negocio) VALUES (?, ?, ?)', [2, 'Symbiot Technologies', 'Desarrollo IoT y Aplicaciones']);
    console.log('✅ Empresas insertadas');
    
    // Usuarios
    const passwordHash = await bcrypt.hash('admin123', 10);
    const usuarios = [
        [1, 'Marco Delgado', 'marco.delgado@symbiot.com.mx', passwordHash, 'admin', 'Symbiot Technologies'],
        [2, 'Antonio Razo', 'antonio.razo@symbiot.com.mx', passwordHash, 'admin', 'Symbiot Technologies'],
        [3, 'Hugo Vazquez', 'hugo.vazquez@rockstarskull.com', passwordHash, 'user', 'Rockstar Skull'],
        [4, 'Escuela', 'escuela@rockstarskull.com', passwordHash, 'user', 'Rockstar Skull']
    ];
    
    for (const [id, nombre, email, password, rol, empresa] of usuarios) {
        await executeQuery('INSERT INTO usuarios (id, nombre, email, password_hash, rol, empresa) VALUES (?, ?, ?, ?, ?, ?)', [id, nombre, email, password, rol, empresa]);
    }
    console.log('✅ Usuarios insertados');
    
    // Maestros
    const maestros = [
        [1, 'Hugo Vazquez', 'hugo.vazquez@rockstarskull.com', null, 'Director y Guitarra Eléctrica', 1],
        [2, 'Julio', 'julio@rockstarskull.com', null, 'Batería', 1],
        [3, 'Demian', 'demian@rockstarskull.com', null, 'Batería', 1],
        [4, 'Irwin', 'irwin@rockstarskull.com', null, 'Guitarra Eléctrica', 1],
        [5, 'Nahomy', 'nahomy@rockstarskull.com', null, 'Canto', 1],
        [6, 'Luis', 'luis@rockstarskull.com', null, 'Bajo Eléctrico', 1],
        [7, 'Manuel', 'manuel@rockstarskull.com', null, 'Piano/Teclado', 1],
        [8, 'Harim López', 'harim.lopez@rockstarskull.com', null, 'Piano/Teclado', 1]
    ];
    
    for (const [id, nombre, email, telefono, especialidad, empresa_id] of maestros) {
        await executeQuery('INSERT INTO maestros (id, nombre, email, telefono, especialidad, empresa_id) VALUES (?, ?, ?, ?, ?, ?)', [id, nombre, email, telefono, especialidad, empresa_id]);
    }
    console.log('✅ Maestros insertados');
    
    // Staff
    const staff = [
        [1, 'Marco Delgado', 'marco.delgado@symbiot.com.mx', null, 'Financial Manager', 2],
        [2, 'Antonio Razo', 'antonio.razo@symbiot.com.mx', null, 'Marketing Manager', 2],
        [3, 'Santiago Rosas', 'santiago.rosas@rockstarskull.com', null, 'Staff Leader', 1],
        [4, 'Emiliano Rosas', 'emiliano.rosas@rockstarskull.com', null, 'MKT Leader', 1],
        [5, 'Maria de la Luz Nava', 'maria.nava@rockstarskull.com', null, 'Cleaning Concierge', 1]
    ];
    
    for (const [id, nombre, email, telefono, puesto, empresa_id] of staff) {
        await executeQuery('INSERT INTO staff (id, nombre, email, telefono, puesto, empresa_id) VALUES (?, ?, ?, ?, ?, ?)', [id, nombre, email, telefono, puesto, empresa_id]);
    }
    console.log('✅ Staff insertado');
}

// 💰 Procesar Ingresos de Symbiot Technologies
async function procesarIngresosSymbiot(workbook) {
    try {
        console.log('\n💰 PROCESANDO INGRESOS SYMBIOT...');
        
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
                if (!fecha) continue;
                
                const concepto = limpiarTexto(row.Proyecto) || 'Proyecto sin descripción';
                const precioMXN = parseFloat(row['Precio (MXN)']) || 0;
                const tipoPago = limpiarTexto(row['Tipo de pago']) || 'Transferencia';
                
                if (precioMXN <= 0) continue;
                
                await executeQuery(`
                    INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [fecha, concepto, 'Marco Delgado', 2, tipoPago, 1, precioMXN, 'I', 1]);
                
                insertados++;
                
            } catch (error) {
                console.error('❌ Error insertando ingreso Symbiot:', error.message);
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
        console.log('\n💸 PROCESANDO GASTOS SYMBIOT...');
        
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
                if (!fecha) continue;
                
                const concepto = limpiarTexto(row.Concepto) || 'Gasto operativo';
                const socio = limpiarTexto(row.Socio) || 'Marco Delgado';
                const formaPago = limpiarTexto(row['Forma de Pago']) || 'Efectivo';
                const cantidad = parseFloat(row.Cantidad) || 1;
                const precioUnitario = parseFloat(row['Precio x unidad']) || 0;
                
                if (precioUnitario <= 0) continue;
                
                const usuario = USUARIOS_MAP[socio] || USUARIOS_MAP['Marco Delgado'];
                
                await executeQuery(`
                    INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [fecha, concepto, socio, 2, formaPago, cantidad, precioUnitario, 'G', usuario.id]);
                
                insertados++;
                
            } catch (error) {
                console.error('❌ Error insertando gasto Symbiot:', error.message);
            }
        }
        
        console.log(`💸 Total gastos Symbiot insertados: ${insertados}`);
        
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
        const alumnosValidos = data.filter(row => row.Alumno && row['Fecha de inscripción']);
        
        console.log(`📊 Encontrados ${alumnosValidos.length} alumnos válidos`);
        
        let alumnosInsertados = 0;
        let pagosInsertados = 0;
        let transaccionesIngreso = 0;
        
        for (const row of alumnosValidos) {
            try {
                // Datos del alumno
                const nombre = limpiarTexto(row.Alumno);
                const edad = parseInt(row.Edad) || null;
                const maestroNombre = limpiarTexto(row.Maestro) || 'Hugo Vazquez';
                const fechaInscripcion = convertirFechaExcel(row['Fecha de inscripción']);
                const promocion = limpiarTexto(row.Promoción) || ''; // ← Cambiar null por string vacío
                const clase = limpiarTexto(row.Clase) || 'Guitarra';
                const tipoClase = limpiarTexto(row['Tipo de Clase']) || 'Grupal';
                const horario = limpiarTexto(row.Horario) || null;
                const formaPago = limpiarTexto(row['Forma de pago']) || 'Efectivo';
                const domiciliado = row.Domiciliado === 'Si' || row.Domiciliado === 'YES' || row.Domiciliado === 1;
                const estatus = limpiarTexto(row.Estatus) === 'Baja' ? 'Baja' : 'Activo';
                
                if (!nombre || !fechaInscripcion) {
                    console.log(`⚠️ Alumno saltado: nombre="${nombre}", fecha="${fechaInscripcion}"`);
                    continue;
                }
                
                // Calcular precio mensual
                const precioMensual = calcularPrecioMensual(tipoClase, domiciliado, promocion);
                
                // Obtener maestro_id
                const maestroId = MAESTROS_MAP[maestroNombre] || 1;
                
                // Insertar alumno
                const result = await executeQuery(`
                    INSERT INTO alumnos (nombre, edad, telefono, email, clase, tipo_clase, maestro_id, horario,
                                       fecha_inscripcion, promocion, precio_mensual, forma_pago, domiciliado, estatus, empresa_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [nombre, edad, null, null, clase, tipoClase, maestroId, horario, fechaInscripcion, promocion, precioMensual, formaPago, domiciliado, estatus, 1]);
                
                const alumnoId = result.insertId;
                alumnosInsertados++;
                
                // Procesar pagos mensuales
                let fechaUltimoPago = null;
                
                for (const [columna, valor] of Object.entries(row)) {
                    if (MESES_MAP[columna]) {
                        const montoPago = parseFloat(valor) || 0;
                        
                        if (montoPago > 0) {
                            const { año, mes } = MESES_MAP[columna];
                            const fechaPago = crearFechaPago(fechaInscripcion, año, mes);
                            
                            // Insertar pago mensual
                            await executeQuery(`
                                INSERT INTO pagos_mensuales (alumno_id, año, mes, monto_pagado, fecha_pago, metodo_pago)
                                VALUES (?, ?, ?, ?, ?, ?)
                                ON DUPLICATE KEY UPDATE monto_pagado = VALUES(monto_pagado), fecha_pago = VALUES(fecha_pago)
                            `, [alumnoId, año, mes, montoPago, fechaPago, formaPago]);
                            
                            pagosInsertados++;
                            
                            // Crear transacción de ingreso
                            await executeQuery(`
                                INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [fechaPago, `Pago mensualidad ${clase} - ${nombre}`, maestroNombre, 1, formaPago, 1, montoPago, 'I', 3]);
                            
                            transaccionesIngreso++;
                            
                            // Actualizar última fecha de pago
                            if (!fechaUltimoPago || new Date(fechaPago) > new Date(fechaUltimoPago)) {
                                fechaUltimoPago = fechaPago;
                            }
                        }
                    }
                }
                
                // Actualizar fecha_ultimo_pago del alumno
                if (fechaUltimoPago) {
                    await executeQuery('UPDATE alumnos SET fecha_ultimo_pago = ? WHERE id = ?', [fechaUltimoPago, alumnoId]);
                }
                
                if (alumnosInsertados % 10 === 0) {
                    console.log(`📈 Procesados ${alumnosInsertados} alumnos...`);
                }
                
            } catch (error) {
                console.error(`❌ Error insertando alumno "${row.Alumno || 'DESCONOCIDO'}":`, error.message);
                console.error(`   Datos: nombre="${row.Alumno}", maestro="${row.Maestro}", promoción="${row.Promoción}"`);
            }
        }
        
        console.log(`🎵 Total alumnos insertados: ${alumnosInsertados}`);
        console.log(`💰 Total pagos mensuales insertados: ${pagosInsertados}`);
        console.log(`📈 Total transacciones de ingreso: ${transaccionesIngreso}`);
        
    } catch (error) {
        console.error('❌ Error procesando ingresos RockstarSkull:', error.message);
    }
}

// 🎭 Procesar Gastos de RockstarSkull
async function procesarGastosRockstarSkull(workbook) {
    try {
        console.log('\n🎭 PROCESANDO GASTOS ROCKSTAR SKULL...');
        
        const worksheet = workbook.Sheets['Gastos RockstarSkull'];
        if (!worksheet) {
            console.log('⚠️ Hoja "Gastos RockstarSkull" no encontrada');
            return;
        }
        
        const data = XLSX.utils.sheet_to_json(worksheet);
        const gastosValidos = data.filter(row => row.Fecha && row.Concepto && row.Total > 0);
        
        console.log(`📊 Encontrados ${gastosValidos.length} gastos válidos`);
        
        let insertados = 0;
        
        for (const row of gastosValidos) {
            try {
                const fecha = convertirFechaExcel(row.Fecha);
                if (!fecha) continue;
                
                const concepto = limpiarTexto(row.Concepto) || 'Gasto operativo';
                const socio = limpiarTexto(row.Socio) || 'Hugo Vazquez';
                const formaPago = limpiarTexto(row['Forma de Pago']) || 'Efectivo';
                const cantidad = parseFloat(row.Cantidad) || 1;
                const precioUnitario = parseFloat(row['Precio x unidad']) || 0;
                
                if (precioUnitario <= 0) continue;
                
                const usuario = USUARIOS_MAP[socio] || USUARIOS_MAP['Hugo Vazquez'];
                
                await executeQuery(`
                    INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [fecha, concepto, socio, 1, formaPago, cantidad, precioUnitario, 'G', usuario.id]);
                
                insertados++;
                
            } catch (error) {
                console.error('❌ Error insertando gasto RockstarSkull:', error.message);
            }
        }
        
        console.log(`🎭 Total gastos RockstarSkull insertados: ${insertados}`);
        
    } catch (error) {
        console.error('❌ Error procesando gastos RockstarSkull:', error.message);
    }
}

// 📊 Mostrar resumen final
async function mostrarResumenFinal() {
    console.log('\n📊 RESUMEN FINAL:');
    console.log('================');
    
    try {
        const [empresas] = await executeQuery('SELECT COUNT(*) as total FROM empresas');
        const [usuarios] = await executeQuery('SELECT COUNT(*) as total FROM usuarios');
        const [maestros] = await executeQuery('SELECT COUNT(*) as total FROM maestros');
        const [staff] = await executeQuery('SELECT COUNT(*) as total FROM staff');
        const [alumnos] = await executeQuery('SELECT COUNT(*) as total FROM alumnos');
        const [pagos] = await executeQuery('SELECT COUNT(*) as total FROM pagos_mensuales');
        const [transacciones] = await executeQuery('SELECT COUNT(*) as total FROM transacciones');
        const [ingresos] = await executeQuery('SELECT COUNT(*) as total FROM transacciones WHERE tipo = "I"');
        const [gastos] = await executeQuery('SELECT COUNT(*) as total FROM transacciones WHERE tipo = "G"');
        
        console.log(`🏢 Empresas: ${empresas.total}`);
        console.log(`👥 Usuarios: ${usuarios.total}`);
        console.log(`🎸 Maestros: ${maestros.total}`);
        console.log(`👔 Staff: ${staff.total}`);
        console.log(`🎓 Alumnos: ${alumnos.total}`);
        console.log(`💰 Pagos mensuales: ${pagos.total}`);
        console.log(`📊 Transacciones totales: ${transacciones.total}`);
        console.log(`📈 Ingresos: ${ingresos.total}`);
        console.log(`📉 Gastos: ${gastos.total}`);
        
    } catch (error) {
        console.error('⚠️ Error generando resumen:', error.message);
    }
}

// Ejecutar población
poblarBaseDeDatos()
    .then(() => {
        console.log('\n🎉 ¡Proceso completado exitosamente!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error en el proceso:', error.message);
        process.exit(1);
    });

export { poblarBaseDeDatos };