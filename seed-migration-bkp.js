// ====================================================
// SCRIPT DE MIGRACIÓN COMPLETA - SEED MIGRATION
// Archivo: seed-migration.js (crear en la raíz del proyecto)
// Migración completa desde base_transacciones.xlsx con debugging
// ====================================================

import { executeQuery } from './server/config/database.js';
import XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

// 🔧 CONFIGURACIÓN
const EXCEL_FILE = 'base_transacciones.xlsx';
const DEBUG_MODE = true;
const BATCH_SIZE = 50; // Procesar transacciones en lotes para mejor debugging

// 📋 MAPEO DE SOCIOS A CREATED_BY (según análisis previo)
const MAPEO_SOCIOS = {
    'Marco Delgado': 1,
    'Antonio Razo': 2,
    'Hugo Vazquez': 3,
    'Hugo Vázquez': 3, // Variación con tilde
    'Escuela': 4,
    // Todos los maestros mapean a Hugo (created_by = 3)
    'Julio Olvera': 3,
    'Irwin Hernandez': 3,
    'Luis Blanquet': 3,
    'Manuel Reyes': 3,
    'Nahomy Perez': 3,
    'Demian Andrade': 3,
    'Harim Lopez': 3
};

// 🚀 FUNCIÓN PRINCIPAL
async function ejecutarMigracionCompleta() {
    console.log('🚀 INICIANDO MIGRACIÓN COMPLETA - SEED MIGRATION');
    console.log('================================================\n');
    
    let etapa = 1;
    
    try {
        // ETAPA 1: Verificaciones iniciales
        console.log(`📋 ETAPA ${etapa++}: VERIFICACIONES INICIALES`);
        console.log('─'.repeat(50));
        await verificacionesIniciales();
        
        // ETAPA 2: Limpiar datos actuales
        console.log(`\n🧹 ETAPA ${etapa++}: LIMPIAR DATOS ACTUALES`);
        console.log('─'.repeat(50));
        await limpiarDatosActuales();
        
        // ETAPA 3: Insertar datos básicos del schema
        console.log(`\n📊 ETAPA ${etapa++}: INSERTAR DATOS BÁSICOS`);
        console.log('─'.repeat(50));
        await insertarDatosBasicos();
        
        // ETAPA 4: Cargar y analizar Excel
        console.log(`\n📁 ETAPA ${etapa++}: CARGAR Y ANALIZAR EXCEL`);
        console.log('─'.repeat(50));
        const workbook = await cargarYAnalizarExcel();
        
        // ETAPA 5: Procesar alumnos de hoja "Alumnos"
        console.log(`\n🎓 ETAPA ${etapa++}: PROCESAR ALUMNOS`);
        console.log('─'.repeat(50));
        await procesarAlumnos(workbook);
        
        // ETAPA 6: Procesar transacciones del Excel
        console.log(`\n💰 ETAPA ${etapa++}: PROCESAR TRANSACCIONES`);
        console.log('─'.repeat(50));
        await procesarTransaccionesExcel(workbook);
        
        // ETAPA 7: Corregir categorizaciones incorrectas
        console.log(`\n🔧 ETAPA ${etapa++}: CORREGIR CATEGORIZACIÓN`);
        console.log('─'.repeat(50));
        await corregirCategorizacion();
        
        // ETAPA 8: Validar integridad final
        console.log(`\n✅ ETAPA ${etapa++}: VALIDAR INTEGRIDAD`);
        console.log('─'.repeat(50));
        await validarIntegridadFinal();
        
        console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('📊 Dashboard disponible en: http://localhost:3000/gastos');
        
    } catch (error) {
        console.error(`\n❌ ERROR EN ETAPA ${etapa-1}:`, error.message);
        console.error('📍 Stack completo:', error.stack);
        throw error;
    }
}

// 🔍 ETAPA 1: Verificaciones iniciales
async function verificacionesIniciales() {
    debug('🔗 Verificando conexión a base de datos...');
    try {
        const [result] = await executeQuery('SELECT 1 as test');
        debug(`✅ Conexión DB exitosa: ${JSON.stringify(result)}`);
    } catch (error) {
        throw new Error(`Fallo conexión DB: ${error.message}`);
    }
    
    debug('📁 Verificando archivo Excel...');
    const excelPath = path.join(process.cwd(), EXCEL_FILE);
    if (!fs.existsSync(excelPath)) {
        throw new Error(`Archivo Excel no encontrado: ${EXCEL_FILE}`);
    }
    debug(`✅ Excel encontrado en: ${excelPath}`);
    
    debug('📊 Verificando estado actual de tablas...');
    const tablas = ['transacciones', 'alumnos', 'maestros', 'usuarios', 'empresas'];
    for (const tabla of tablas) {
        try {
            const [count] = await executeQuery(`SELECT COUNT(*) as total FROM ${tabla}`);
            debug(`📋 ${tabla}: ${count.total} registros actuales`);
        } catch (error) {
            debug(`⚠️ Tabla ${tabla} no existe o error: ${error.message}`);
        }
    }
}

// 🧹 ETAPA 2: Limpiar datos actuales (SUSTITUCIÓN COMPLETA)
async function limpiarDatosActuales() {
    debug('🧹 INICIANDO LIMPIEZA COMPLETA - SUSTITUCIÓN DE DATOS');
    debug('⚠️  TODOS LOS DATOS EXISTENTES SERÁN ELIMINADOS PERMANENTEMENTE');
    
    // Desactivar foreign key checks temporalmente para evitar errores de dependencias
    try {
        await executeQuery('SET FOREIGN_KEY_CHECKS = 0');
        debug('🔓 Foreign key checks desactivados temporalmente');
    } catch (error) {
        debug('⚠️ No se pudieron desactivar foreign key checks, continuando...');
    }
    
    // ORDEN CRÍTICO: De dependientes a independientes para evitar errores
    const tablasEnOrden = [
        'transacciones',      // Depende de: empresas, usuarios, clientes
        'pagos_mensuales',    // Depende de: alumnos  
        'alumnos',           // Depende de: maestros, empresas
        'clientes',          // Depende de: empresas
        'staff',             // Depende de: empresas
        'maestros',          // Depende de: empresas
        'usuarios',          // Independiente (pero referenciado por transacciones)
        'empresas'           // Base - referenciado por todas las demás
    ];
    
    debug(`📋 Tablas a limpiar: ${tablasEnOrden.join(', ')}`);
    
    // Contador de registros eliminados
    let totalEliminados = 0;
    
    for (const tabla of tablasEnOrden) {
        try {
            debug(`🗑️  Procesando tabla: ${tabla}`);
            
            // Verificar si la tabla existe y contar registros
            const [count] = await executeQuery(`SELECT COUNT(*) as total FROM ${tabla}`);
            const registrosExistentes = count.total;
            
            debug(`   📊 Registros encontrados: ${registrosExistentes}`);
            
            if (registrosExistentes > 0) {
                // Eliminar TODOS los datos de la tabla
                await executeQuery(`DELETE FROM ${tabla}`);
                debug(`   🗑️  ${registrosExistentes} registros eliminados`);
                totalEliminados += registrosExistentes;
                
                // Reiniciar AUTO_INCREMENT para empezar desde 1
                try {
                    await executeQuery(`ALTER TABLE ${tabla} AUTO_INCREMENT = 1`);
                    debug(`   🔄 AUTO_INCREMENT reiniciado para ${tabla}`);
                } catch (aiError) {
                    debug(`   ℹ️  ${tabla}: ${aiError.message.includes('AUTO_INCREMENT') ? 'No tiene AUTO_INCREMENT' : 'Error con AUTO_INCREMENT'}`);
                }
                
                // Verificar que la tabla esté realmente vacía
                const [verifyCount] = await executeQuery(`SELECT COUNT(*) as total FROM ${tabla}`);
                if (verifyCount.total > 0) {
                    throw new Error(`FALLO CRÍTICO: La tabla ${tabla} aún tiene ${verifyCount.total} registros después del borrado`);
                }
                
            } else {
                debug(`   ✅ ${tabla} ya estaba vacía`);
            }
            
        } catch (error) {
            const errorMsg = `❌ ERROR ELIMINANDO ${tabla}: ${error.message}`;
            debug(errorMsg);
            
            // Para errores críticos, detener el proceso
            if (error.message.includes('FALLO CRÍTICO')) {
                throw new Error(`PROCESO DETENIDO: ${errorMsg}`);
            }
            
            // Para otros errores, continuar pero reportar
            debug(`   🔄 Continuando con siguiente tabla...`);
        }
    }
    
    // Reactivar foreign key checks
    try {
        await executeQuery('SET FOREIGN_KEY_CHECKS = 1');
        debug('🔒 Foreign key checks reactivados');
    } catch (error) {
        debug('⚠️ Error reactivando foreign key checks:', error.message);
    }
    
    // Verificación final - TODAS las tablas deben estar en 0
    debug('\n🔍 VERIFICACIÓN FINAL DE LIMPIEZA:');
    let verificacionFallida = false;
    
    for (const tabla of tablasEnOrden) {
        try {
            const [finalCount] = await executeQuery(`SELECT COUNT(*) as total FROM ${tabla}`);
            if (finalCount.total > 0) {
                debug(`   ❌ ${tabla}: ${finalCount.total} registros (DEBERÍA ESTAR VACÍA)`);
                verificacionFallida = true;
            } else {
                debug(`   ✅ ${tabla}: 0 registros (LIMPIA)`);
            }
        } catch (error) {
            debug(`   ⚠️ ${tabla}: Error verificando - ${error.message}`);
        }
    }
    
    if (verificacionFallida) {
        throw new Error('FALLO DE VERIFICACIÓN: Algunas tablas no se limpiaron completamente');
    }
    
    debug('\n✅ LIMPIEZA COMPLETA EXITOSA');
    debug(`📊 Total de registros eliminados: ${totalEliminados}`);
    debug('📋 Todas las tablas están vacías y listas para nueva migración');
    debug('🔄 AUTO_INCREMENT reiniciado en todas las tablas aplicables');
}

// 📊 ETAPA 3: Insertar datos básicos del schema
async function insertarDatosBasicos() {
    debug('📊 Insertando datos básicos del schema...');
    
    // 3.1 - Empresas
    debug('🏢 Insertando empresas...');
    const empresas = [
        [1, 'Rockstar Skull', 'Academia de Música'],
        [2, 'Symbiot Technologies', 'Desarrollo IoT y Aplicaciones']
    ];
    
    for (const [id, nombre, tipo] of empresas) {
        await executeQuery(
            'INSERT INTO empresas (id, nombre, tipo_negocio) VALUES (?, ?, ?)',
            [id, nombre, tipo]
        );
        debug(`✅ Empresa insertada: ${nombre} (ID: ${id})`);
    }
    
    // 3.2 - Usuarios
    debug('👥 Insertando usuarios...');
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const usuarios = [
        [1, 'Marco Delgado', 'marco.delgado@symbiot.com.mx', passwordHash, 'admin', 'Symbiot Technologies'],
        [2, 'Antonio Razo', 'antonio.razo@symbiot.com.mx', passwordHash, 'admin', 'Symbiot Technologies'],
        [3, 'Hugo Vazquez', 'hugo.vazquez@rockstarskull.com', passwordHash, 'user', 'Rockstar Skull'],
        [4, 'Escuela', 'escuela@rockstarskull.com', passwordHash, 'user', 'Rockstar Skull']
    ];
    
    for (const [id, nombre, email, password, rol, empresa] of usuarios) {
        await executeQuery(
            'INSERT INTO usuarios (id, nombre, email, password_hash, rol, empresa) VALUES (?, ?, ?, ?, ?, ?)',
            [id, nombre, email, password, rol, empresa]
        );
        debug(`✅ Usuario insertado: ${nombre} (${rol})`);
    }
    
    // 3.3 - Maestros
    debug('🎸 Insertando maestros...');
    const maestros = [
        [1, 'Hugo Vazquez', 'hugo.vazquez@rockstarskull.com', null, 'Director y Guitarra Eléctrica', 1],
        [2, 'Julio Olvera', 'julio@rockstarskull.com', null, 'Batería', 1],
        [3, 'Demian Andrade', 'demian@rockstarskull.com', null, 'Batería', 1],
        [4, 'Irwin Hernandez', 'irwin@rockstarskull.com', null, 'Guitarra Eléctrica', 1],
        [5, 'Nahomy Perez', 'nahomy@rockstarskull.com', null, 'Canto', 1],
        [6, 'Luis Blanquet', 'luis@rockstarskull.com', null, 'Bajo Eléctrico', 1],
        [7, 'Manuel Reyes', 'manuel@rockstarskull.com', null, 'Piano/Teclado', 1],
        [8, 'Harim Lopez', 'harim.lopez@rockstarskull.com', null, 'Piano/Teclado', 1]
    ];
    
    for (const [id, nombre, email, telefono, especialidad, empresa_id] of maestros) {
        await executeQuery(
            'INSERT INTO maestros (id, nombre, email, telefono, especialidad, empresa_id) VALUES (?, ?, ?, ?, ?, ?)',
            [id, nombre, email, telefono, especialidad, empresa_id]
        );
        debug(`✅ Maestro insertado: ${nombre} - ${especialidad}`);
    }
    
    // 3.4 - Staff
    debug('👔 Insertando staff...');
    const staff = [
        [1, 'Marco Delgado', 'marco.delgado@symbiot.com.mx', null, 'Financial Manager', 2],
        [2, 'Antonio Razo', 'antonio.razo@symbiot.com.mx', null, 'Marketing Manager', 2],
        [3, 'Santiago Rosas', 'santiago.rosas@rockstarskull.com', null, 'Staff Leader', 1],
        [4, 'Emiliano Rosas', 'emiliano.rosas@rockstarskull.com', null, 'MKT Leader', 1],
        [5, 'Maria de la Luz Nava', 'maria.nava@rockstarskull.com', null, 'Cleaning Concierge', 1]
    ];
    
    for (const [id, nombre, email, telefono, puesto, empresa_id] of staff) {
        await executeQuery(
            'INSERT INTO staff (id, nombre, email, telefono, puesto, empresa_id) VALUES (?, ?, ?, ?, ?, ?)',
            [id, nombre, email, telefono, puesto, empresa_id]
        );
        debug(`✅ Staff insertado: ${nombre} - ${puesto}`);
    }
    
    debug('✅ Datos básicos insertados completamente');
}

// 📁 ETAPA 4: Cargar y analizar Excel
async function cargarYAnalizarExcel() {
    debug('📁 Cargando archivo Excel...');
    
    const excelPath = path.join(process.cwd(), EXCEL_FILE);
    const buffer = fs.readFileSync(excelPath);
    debug(`✅ Archivo leído, tamaño: ${buffer.length} bytes`);
    
    const workbook = XLSX.read(buffer, {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true
    });
    
    debug(`📋 Hojas encontradas: ${workbook.SheetNames.join(', ')}`);
    
    // Verificar hoja principal
    if (!workbook.Sheets['TransaccionesConsolidado']) {
        throw new Error('Hoja "TransaccionesConsolidado" no encontrada');
    }
    
    const worksheet = workbook.Sheets['TransaccionesConsolidado'];
    const range = worksheet['!ref'];
    debug(`📏 Rango de datos: ${range}`);
    
    // Convertir a JSON para análisis
    const transacciones = XLSX.utils.sheet_to_json(worksheet);
    debug(`📊 Total de transacciones encontradas: ${transacciones.length}`);
    
    // Análisis de distribución
    const distribPorEmpresa = transacciones.reduce((acc, t) => {
        acc[t.empresa] = (acc[t.empresa] || 0) + 1;
        return acc;
    }, {});
    debug('📊 Distribución por empresa:', distribPorEmpresa);
    
    const distribPorTipo = transacciones.reduce((acc, t) => {
        const key = `${t.empresa} - ${t.tipo}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    debug('📊 Distribución por tipo:', distribPorTipo);
    
    // Verificar socios sin mapeo
    const sociosUnicos = [...new Set(transacciones.map(t => t.socio_maestro_empleado))].filter(Boolean);
    const sociosSinMapeo = sociosUnicos.filter(socio => !MAPEO_SOCIOS[socio]);
    
    if (sociosSinMapeo.length > 0) {
        console.warn('⚠️ SOCIOS SIN MAPEO ENCONTRADOS:', sociosSinMapeo);
        console.warn('💡 Se asignarán como created_by = 3 (Hugo Vazquez) por defecto');
    }
    
    debug('✅ Excel cargado y analizado correctamente');
    return workbook;
}

// 💰 ETAPA 5: Procesar transacciones del Excel
async function procesarTransaccionesExcel(workbook) {
    debug('💰 Iniciando procesamiento de transacciones...');
    
    const worksheet = workbook.Sheets['TransaccionesConsolidado'];
    const transacciones = XLSX.utils.sheet_to_json(worksheet);
    
    debug(`📊 Procesando ${transacciones.length} transacciones en lotes de ${BATCH_SIZE}`);
    
    let procesadas = 0;
    let exitosas = 0;
    let errores = 0;
    const erroresDetalle = [];
    
    // Procesar en lotes para mejor debugging
    for (let i = 0; i < transacciones.length; i += BATCH_SIZE) {
        const lote = transacciones.slice(i, i + BATCH_SIZE);
        const numeroLote = Math.floor(i / BATCH_SIZE) + 1;
        const totalLotes = Math.ceil(transacciones.length / BATCH_SIZE);
        
        debug(`📦 Procesando lote ${numeroLote}/${totalLotes} (${lote.length} transacciones)`);
        
        for (const transaccion of lote) {
            try {
                procesadas++;
                
                // Validar y transformar datos
                const datosTransformados = transformarTransaccion(transaccion, procesadas);
                
                if (!datosTransformados) {
                    errores++;
                    erroresDetalle.push(`Fila ${procesadas}: Datos inválidos - ${JSON.stringify(transaccion).substring(0, 100)}`);
                    continue;
                }
                
                // Insertar en base de datos
                await executeQuery(`
                    INSERT INTO transacciones 
                    (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by, cliente_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    datosTransformados.fecha,
                    datosTransformados.concepto,
                    datosTransformados.socio,
                    datosTransformados.empresa_id,
                    datosTransformados.forma_pago,
                    datosTransformados.cantidad,
                    datosTransformados.precio_unitario,
                    datosTransformados.tipo,
                    datosTransformados.created_by,
                    null // cliente_id siempre NULL según instrucción
                ]);
                
                exitosas++;
                
                // Debugging cada 100 transacciones
                if (procesadas % 100 === 0) {
                    debug(`   📊 Progreso: ${procesadas}/${transacciones.length} (${exitosas} exitosas, ${errores} errores)`);
                }
                
            } catch (error) {
                errores++;
                erroresDetalle.push(`Fila ${procesadas}: ${error.message}`);
                debug(`   ❌ Error fila ${procesadas}: ${error.message}`);
            }
        }
        
        debug(`✅ Lote ${numeroLote} completado`);
    }
    
    // Resumen final
    console.log('\n📊 RESUMEN DE PROCESAMIENTO:');
    console.log('─'.repeat(40));
    console.log(`📈 Transacciones procesadas: ${procesadas}`);
    console.log(`✅ Insertadas exitosamente: ${exitosas}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📊 Tasa de éxito: ${((exitosas/procesadas)*100).toFixed(2)}%`);
    
    if (errores > 0) {
        console.log('\n⚠️ DETALLES DE ERRORES:');
        erroresDetalle.slice(0, 10).forEach(error => console.log(`   • ${error}`));
        if (erroresDetalle.length > 10) {
            console.log(`   ... y ${erroresDetalle.length - 10} errores más`);
        }
    }
    
    debug('✅ Procesamiento de transacciones completado');
}

// 🔄 Función auxiliar: transformar transacción del Excel al formato DB
function transformarTransaccion(transaccion, numeroFila) {
    try {
        // Debug de datos de entrada para identificar problemas
        if (numeroFila <= 5 || numeroFila % 100 === 0) {
            debug(`   🔍 Fila ${numeroFila} - Datos originales: ${JSON.stringify(transaccion).substring(0, 200)}...`);
        }
        
        // Validaciones básicas más flexibles
        const fecha = transaccion.fecha;
        const concepto = transaccion.concepto;
        const total = transaccion.total || transaccion.precio_unitario;
        
        if (!fecha || !concepto || (!total && total !== 0)) {
            debug(`   ⚠️ Fila ${numeroFila}: Campos obligatorios faltantes - fecha: ${!!fecha}, concepto: ${!!concepto}, total: ${total}`);
            return null;
        }
        
        // Transformar fecha de Excel a formato SQL más robusto
        let fechaSQL;
        try {
            if (fecha instanceof Date) {
                fechaSQL = fecha.toISOString().split('T')[0];
            } else if (typeof fecha === 'number') {
                // Fecha de Excel como número serial
                const fechaExcel = new Date((fecha - 25569) * 86400 * 1000);
                fechaSQL = fechaExcel.toISOString().split('T')[0];
            } else if (typeof fecha === 'string') {
                const fechaObj = new Date(fecha);
                if (!isNaN(fechaObj.getTime())) {
                    fechaSQL = fechaObj.toISOString().split('T')[0];
                }
            }
            
            // Validar fecha resultante
            if (!fechaSQL || fechaSQL.includes('NaN') || fechaSQL === 'Invalid Date') {
                debug(`   ⚠️ Fila ${numeroFila}: Fecha inválida: ${fecha} -> ${fechaSQL}`);
                return null;
            }
        } catch (error) {
            debug(`   ⚠️ Fila ${numeroFila}: Error procesando fecha: ${error.message}`);
            return null;
        }
        
        // Transformar tipo - manejar ambos formatos
        let tipo;
        const tipoOriginal = String(transaccion.tipo || '').trim().toLowerCase();
        
        if (tipoOriginal === 'i' || tipoOriginal === 'ingreso') {
            tipo = 'I';
        } else if (tipoOriginal === 'g' || tipoOriginal === 'gasto') {
            tipo = 'G';
        } else {
            debug(`   ⚠️ Fila ${numeroFila}: Tipo inválido: "${transaccion.tipo}" (normalizado: "${tipoOriginal}")`);
            return null;
        }
        
        // Determinar empresa_id más robusto
        let empresa_id;
        const empresaStr = String(transaccion.empresa || '').trim();
        
        if (empresaStr.toLowerCase().includes('rockstar') || empresaStr.toLowerCase().includes('skull')) {
            empresa_id = 1;
        } else if (empresaStr.toLowerCase().includes('symbiot')) {
            empresa_id = 2;
        } else if (transaccion.empresa_id && [1, 2].includes(transaccion.empresa_id)) {
            empresa_id = transaccion.empresa_id;
        } else {
            debug(`   ⚠️ Fila ${numeroFila}: Empresa no reconocida: "${transaccion.empresa}" (empresa_id: ${transaccion.empresa_id})`);
            return null;
        }
        
        // Determinar created_by usando mapeo de socios
        const socio = String(transaccion.socio_maestro_empleado || '').trim();
        const created_by = MAPEO_SOCIOS[socio] || 3; // Default a Hugo Vazquez
        
        if (!MAPEO_SOCIOS[socio] && socio) {
            debug(`   ℹ️ Fila ${numeroFila}: Socio no mapeado "${socio}", usando Hugo Vazquez (id=3)`);
        }
        
        // Limpiar y validar montos más robusto
        let cantidad = parseFloat(transaccion.cantidad) || 1;
        let precio_unitario = parseFloat(total) || parseFloat(transaccion.precio_unitario) || 0;
        
        // Si cantidad es 0 o negativa, usar 1
        if (cantidad <= 0) {
            cantidad = 1;
        }
        
        // Si precio_unitario es negativo, usar valor absoluto
        if (precio_unitario < 0) {
            precio_unitario = Math.abs(precio_unitario);
        }
        
        // Permitir transacciones con precio 0 para casos especiales (becas, etc.)
        if (precio_unitario === 0) {
            debug(`   ℹ️ Fila ${numeroFila}: Transacción con precio cero (posible beca/descuento) - se procesará`);
            // No return null, permitir que continúe
        }
        
        // Limpiar textos
        const conceptoLimpio = String(concepto || '').trim().substring(0, 500);
        const socioLimpio = String(socio || 'Sin especificar').trim().substring(0, 50);
        const forma_pago = String(transaccion.forma_de_pago || transaccion.forma_pago || 'No especificado').trim().substring(0, 50);
        
        const resultado = {
            fecha: fechaSQL,
            concepto: conceptoLimpio,
            socio: socioLimpio,
            empresa_id,
            forma_pago,
            cantidad,
            precio_unitario,
            tipo,
            created_by
        };
        
        // Debug para primeras filas o errores
        if (numeroFila <= 3) {
            debug(`   ✅ Fila ${numeroFila} transformada: ${JSON.stringify(resultado)}`);
        }
        
        return resultado;
        
    } catch (error) {
        debug(`   ❌ Error transformando fila ${numeroFila}: ${error.message}`);
        debug(`   📋 Stack: ${error.stack}`);
        return null;
    }
}

// 🎓 ETAPA 5: Procesar alumnos de hoja "Alumnos"
async function procesarAlumnos(workbook) {
    debug('🎓 Procesando alumnos de la hoja "Alumnos"...');
    
    const worksheet = workbook.Sheets['Alumnos'];
    if (!worksheet) {
        debug('⚠️ Hoja "Alumnos" no encontrada, saltando...');
        return;
    }
    
    const alumnos = XLSX.utils.sheet_to_json(worksheet);
    debug(`📊 Encontrados ${alumnos.length} alumnos en Excel`);
    
    let insertados = 0;
    let errores = 0;
    
    // Mapeo de maestros por nombre
    const maestrosMap = {
        'Hugo Vázquez': 1, 'Hugo Vazquez': 1,
        'Julio Olvera': 2, 'Julio': 2,
        'Demian Andrade': 3, 'Demian': 3,
        'Irwin Hernandez': 4, 'Irwin': 4,
        'Nahomy Pérez': 5, 'Nahomy Perez': 5, 'Nahomy': 5,
        'Luis Blanquet': 6, 'Luis': 6,
        'Manuel Reyes': 7, 'Manuel': 7,
        'Harim López': 8, 'Harim Lopez': 8, 'Harim': 8
    };
    
    for (const alumno of alumnos) {
        try {
            // Transformar fecha de Excel
            let fechaInscripcion;
            if (typeof alumno['Fecha de inscripción'] === 'number') {
                const fechaExcel = new Date((alumno['Fecha de inscripción'] - 25569) * 86400 * 1000);
                fechaInscripcion = fechaExcel.toISOString().split('T')[0];
            } else {
                fechaInscripcion = new Date().toISOString().split('T')[0]; // Fecha actual como fallback
            }
            
            // Mapear maestro
            const nombreMaestro = String(alumno.Maestro || '').trim();
            const maestro_id = maestrosMap[nombreMaestro] || 1; // Default Hugo
            
            // Determinar precio mensual
            const precioUnitario = parseFloat(alumno['Precio x unidad']) || 1500;
            
            // Insertar alumno
            await executeQuery(`
                INSERT INTO alumnos (
                    nombre, edad, clase, tipo_clase, maestro_id, horario,
                    fecha_inscripcion, promocion, precio_mensual, forma_pago,
                    domiciliado, estatus, empresa_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                String(alumno.Alumno || '').trim(),
                parseInt(alumno.Edad) || null,
                String(alumno.Clase || 'Guitarra').trim(),
                String(alumno.Tipo_clase || 'Grupal').trim(),
                maestro_id,
                String(alumno.Horario || '').trim(),
                fechaInscripcion,
                String(alumno.Promocion || '').trim(),
                precioUnitario,
                String(alumno['Forma de Pago'] || 'Efectivo').trim(),
                (alumno.Domicilado === 'Sí' || alumno.Domicilado === 'Si'),
                String(alumno.Estatus || 'Activo').trim(),
                1 // Rockstar Skull
            ]);
            
            insertados++;
            
            if (insertados % 25 === 0) {
                debug(`   📊 Progreso alumnos: ${insertados}/${alumnos.length}`);
            }
            
        } catch (error) {
            errores++;
            debug(`   ❌ Error procesando alumno "${alumno.Alumno}": ${error.message}`);
        }
    }
    
    debug(`✅ Alumnos procesados: ${insertados} exitosos, ${errores} errores`);
}

// 🔧 ETAPA 7: Corregir categorizaciones incorrectas
async function corregirCategorizacion() {
    debug('🔧 Iniciando corrección de categorización...');
    
    let corregidas = 0;
    
    // 1. Mover "Sueldo Maestros Rockstar Skull" de Symbiot a Rockstar
    debug('📚 Moviendo sueldos de maestros de Symbiot → Rockstar...');
    const resultSueldos = await executeQuery(`
        UPDATE transacciones 
        SET empresa_id = 1, socio = 'Escuela'
        WHERE empresa_id = 2 
        AND concepto LIKE '%sueldo%maestros%rockstar%'
    `);
    
    if (resultSueldos.affectedRows > 0) {
        debug(`✅ ${resultSueldos.affectedRows} transacciones de sueldos corregidas`);
        corregidas += resultSueldos.affectedRows;
    }
    
    // 2. Verificar transacciones sospechosas por monto
    debug('💰 Revisando transacciones con montos sospechosos...');
    const sospechosas = await executeQuery(`
        SELECT id, concepto, empresa_id, precio_unitario 
        FROM transacciones 
        WHERE empresa_id = 2 
        AND precio_unitario > 50000
        AND (concepto LIKE '%rockstar%' OR concepto LIKE '%academia%' OR concepto LIKE '%maestr%')
    `);
    
    for (const trans of sospechosas) {
        debug(`   🔍 Revisando: ID ${trans.id} - ${trans.concepto.substring(0, 50)}... (${trans.precio_unitario})`);
        // Por seguridad, solo reportamos sin cambiar automáticamente
    }
    
    // 3. Corregir transacciones con conceptos claramente de Rockstar en Symbiot
    debug('🎸 Moviendo transacciones claramente de academia...');
    const resultAcademia = await executeQuery(`
        UPDATE transacciones 
        SET empresa_id = 1
        WHERE empresa_id = 2 
        AND (concepto LIKE '%mensualidad%' 
             OR concepto LIKE '%academia%' 
             OR concepto LIKE '%estudiante%'
             OR concepto LIKE '%alumno%')
    `);
    
    if (resultAcademia.affectedRows > 0) {
        debug(`✅ ${resultAcademia.affectedRows} transacciones de academia corregidas`);
        corregidas += resultAcademia.affectedRows;
    }
    
    debug(`✅ Corrección completada: ${corregidas} transacciones corregidas total`);
}
async function validarIntegridadFinal() {
    debug('✅ Iniciando validación de integridad final...');
    
    // 6.1 - Contar registros por tabla
    debug('📊 Contando registros finales...');
    const tablas = ['empresas', 'usuarios', 'maestros', 'staff', 'transacciones'];
    
    for (const tabla of tablas) {
        try {
            const [count] = await executeQuery(`SELECT COUNT(*) as total FROM ${tabla}`);
            debug(`📋 ${tabla}: ${count.total} registros`);
        } catch (error) {
            debug(`❌ Error contando ${tabla}: ${error.message}`);
        }
    }
    
    // 6.2 - Validar distribución de transacciones
    debug('📊 Validando distribución de transacciones...');
    
    try {
        const [distribTipo] = await executeQuery(`
            SELECT tipo, COUNT(*) as total 
            FROM transacciones 
            GROUP BY tipo
        `);
        debug('📈 Por tipo:', distribTipo);
        
        const [distribEmpresa] = await executeQuery(`
            SELECT empresa_id, COUNT(*) as total 
            FROM transacciones 
            GROUP BY empresa_id
        `);
        debug('🏢 Por empresa:', distribEmpresa);
        
        const [distribSocio] = await executeQuery(`
            SELECT created_by, COUNT(*) as total 
            FROM transacciones 
            GROUP BY created_by 
            ORDER BY total DESC
            LIMIT 5
        `);
        debug('👥 Top socios:', distribSocio);
        
    } catch (error) {
        debug(`❌ Error en validación de distribución: ${error.message}`);
    }
    
    // 6.3 - Validar integridad referencial
    debug('🔗 Validando integridad referencial...');
    
    try {
        const [huerfanas] = await executeQuery(`
            SELECT COUNT(*) as total 
            FROM transacciones t 
            LEFT JOIN empresas e ON t.empresa_id = e.id 
            WHERE e.id IS NULL
        `);
        
        if (huerfanas.total > 0) {
            debug(`⚠️ ${huerfanas.total} transacciones sin empresa válida`);
        } else {
            debug('✅ Todas las transacciones tienen empresa válida');
        }
        
        const [sinUsuario] = await executeQuery(`
            SELECT COUNT(*) as total 
            FROM transacciones t 
            LEFT JOIN usuarios u ON t.created_by = u.id 
            WHERE u.id IS NULL
        `);
        
        if (sinUsuario.total > 0) {
            debug(`⚠️ ${sinUsuario.total} transacciones sin usuario válido`);
        } else {
            debug('✅ Todas las transacciones tienen usuario válido');
        }
        
    } catch (error) {
        debug(`❌ Error en validación referencial: ${error.message}`);
    }
    
    // 6.4 - Calcular totales financieros
    debug('💰 Calculando totales financieros...');
    
    try {
        const totales = await executeQuery(`
            SELECT 
                tipo,
                empresa_id,
                COUNT(*) as transacciones,
                SUM(total) as monto_total
            FROM transacciones 
            GROUP BY tipo, empresa_id 
            ORDER BY empresa_id, tipo
        `);
        
        debug('💵 Totales por empresa y tipo:');
        if (Array.isArray(totales) && totales.length > 0) {
            totales.forEach(total => {
                const empresa = total.empresa_id === 1 ? 'Rockstar Skull' : 'Symbiot Tech';
                const tipoDesc = total.tipo === 'I' ? 'Ingresos' : 'Gastos';
                debug(`   ${empresa} - ${tipoDesc}: ${total.transacciones} transacciones, ${total.monto_total}`);
            });
        } else {
            debug('   No se encontraron totales o estructura inesperada');
        }
        
    } catch (error) {
        debug(`❌ Error calculando totales: ${error.message}`);
    }
    
    debug('✅ Validación de integridad completada');
}

// 🐛 Función auxiliar de debugging
function debug(mensaje) {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString().substr(11, 8);
        console.log(`[${timestamp}] ${mensaje}`);
    }
}

// 🚀 EJECUTAR MIGRACIÓN
ejecutarMigracionCompleta()
    .then(() => {
        console.log('\n🎉 MIGRACIÓN EXITOSA - PROCESO COMPLETADO');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 MIGRACIÓN FALLIDA:', error.message);
        console.error('📍 Para debugging, revisar logs anteriores');
        process.exit(1);
    });