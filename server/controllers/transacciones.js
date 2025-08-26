// ====================================================
// CONTROLADOR DE TRANSACCIONES (GASTOS E INGRESOS)
// Archivo: server/controllers/transacciones.js
// ====================================================

import { executeQuery } from '../config/database.js';

export const transaccionesController = {
    // Obtener todas las transacciones con filtros
    getTransacciones: async (req, res) => {
        try {
            const { 
                tipo, 
                empresa_id, 
                socio, 
                fechaInicio, 
                fechaFin, 
                page = 1, 
                limit = 1000 
            } = req.query;

            let query = `
                SELECT t.*, e.nombre as nombre_empresa 
                FROM transacciones t 
                LEFT JOIN empresas e ON t.empresa_id = e.id 
                WHERE 1=1
            `;
            const params = [];

            // Filtros
            if (tipo && (tipo === 'G' || tipo === 'I')) {
                query += ' AND t.tipo = ?';
                params.push(tipo);
            }

            if (empresa_id) {
                query += ' AND t.empresa_id = ?';
                params.push(empresa_id);
            }

            if (socio) {
                query += ' AND t.socio LIKE ?';
                params.push(`%${socio}%`);
            }

            if (fechaInicio) {
                query += ' AND t.fecha >= ?';
                params.push(fechaInicio);
            }

            if (fechaFin) {
                query += ' AND t.fecha <= ?';
                params.push(fechaFin);
            }

            query += ' ORDER BY t.fecha DESC, t.id DESC';

            // Paginación
            const offset = (page - 1) * limit;
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const transacciones = await executeQuery(query, params);

            // Contar total de registros
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM transacciones t 
                WHERE 1=1
            `;
            const countParams = params.slice(0, -2); // Remover limit y offset

            if (tipo && (tipo === 'G' || tipo === 'I')) countQuery += ' AND t.tipo = ?';
            if (empresa_id) countQuery += ' AND t.empresa_id = ?';
            if (socio) countQuery += ' AND t.socio LIKE ?';
            if (fechaInicio) countQuery += ' AND t.fecha >= ?';
            if (fechaFin) countQuery += ' AND t.fecha <= ?';

            const totalCount = await executeQuery(countQuery, countParams);

            res.json({
                success: true,
                data: transacciones,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount[0].total,
                    pages: Math.ceil(totalCount[0].total / limit)
                }
            });

        } catch (error) {
            console.error('Error al obtener transacciones:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // Crear nueva transacción (gasto o ingreso)
    createTransaccion: async (req, res) => {
        try {
            const {
                fecha,
                concepto,
                empresa_id,
                forma_pago,
                cantidad,
                precio_unitario,
                tipo // 'G' para gasto, 'I' para ingreso
            } = req.body;

            // Validaciones
            if (!fecha || !concepto || !empresa_id || !forma_pago || !cantidad || !precio_unitario || !tipo) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos requeridos'
                });
            }

            if (tipo !== 'G' && tipo !== 'I') {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo debe ser G (gasto) o I (ingreso)'
                });
            }

            // Obtener el nombre del usuario logueado
            const socio = req.session.user.nombre;
            const created_by = req.session.user.id;

            const query = `
                INSERT INTO transacciones (
                    fecha, concepto, socio, empresa_id, forma_pago, 
                    cantidad, precio_unitario, tipo, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await executeQuery(query, [
                fecha, concepto, socio, empresa_id, forma_pago,
                cantidad, precio_unitario, tipo, created_by
            ]);

            // Obtener la transacción recién creada
            const nuevaTransaccion = await executeQuery(`
                SELECT t.*, e.nombre as nombre_empresa
                FROM transacciones t 
                LEFT JOIN empresas e ON t.empresa_id = e.id 
                WHERE t.id = ?
            `, [result.insertId]);

            console.log(`✅ ${tipo === 'G' ? 'Gasto' : 'Ingreso'} creado: ${concepto} - $${cantidad * precio_unitario}`);

            res.status(201).json({
                success: true,
                message: `${tipo === 'G' ? 'Gasto' : 'Ingreso'} registrado exitosamente`,
                data: nuevaTransaccion[0]
            });

        } catch (error) {
            console.error('Error al crear transacción:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // Actualizar transacción
    updateTransaccion: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                fecha,
                concepto,
                empresa_id,
                forma_pago,
                cantidad,
                precio_unitario,
                tipo
            } = req.body;

            // Verificar que la transacción existe y pertenece al usuario
            const existeTransaccion = await executeQuery(
                'SELECT * FROM transacciones WHERE id = ? AND created_by = ?',
                [id, req.session.user.id]
            );

            if (existeTransaccion.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Transacción no encontrada'
                });
            }

            const query = `
                UPDATE transacciones SET 
                    fecha = ?, concepto = ?, empresa_id = ?, forma_pago = ?,
                    cantidad = ?, precio_unitario = ?, tipo = ?
                WHERE id = ? AND created_by = ?
            `;

            await executeQuery(query, [
                fecha, concepto, empresa_id, forma_pago,
                cantidad, precio_unitario, tipo, id, req.session.user.id
            ]);

            console.log(`✅ Transacción ${id} actualizada por ${req.session.user.nombre}`);

            res.json({ 
                success: true, 
                message: 'Transacción actualizada exitosamente' 
            });

        } catch (error) {
            console.error('Error al actualizar transacción:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // Eliminar transacción
    deleteTransaccion: async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar que la transacción existe y pertenece al usuario
            const existeTransaccion = await executeQuery(
                'SELECT concepto, tipo FROM transacciones WHERE id = ? AND created_by = ?',
                [id, req.session.user.id]
            );

            if (existeTransaccion.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Transacción no encontrada'
                });
            }

            await executeQuery(
                'DELETE FROM transacciones WHERE id = ? AND created_by = ?',
                [id, req.session.user.id]
            );

            console.log(`✅ Transacción eliminada: ${existeTransaccion[0].concepto} (${existeTransaccion[0].tipo})`);

            res.json({ 
                success: true, 
                message: 'Transacción eliminada exitosamente' 
            });

        } catch (error) {
            console.error('Error al eliminar transacción:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // Obtener resumen de transacciones
    getResumen: async (req, res) => {
        try {
            const { empresa_id, fechaInicio, fechaFin } = req.query;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (empresa_id) {
                whereClause += ' AND empresa_id = ?';
                params.push(empresa_id);
            }

            if (fechaInicio) {
                whereClause += ' AND fecha >= ?';
                params.push(fechaInicio);
            }

            if (fechaFin) {
                whereClause += ' AND fecha <= ?';
                params.push(fechaFin);
            }

            // Consulta principal para obtener totales por tipo
            const resumenQuery = `
                SELECT 
                    CASE 
                        WHEN tipo = 'I' THEN 'ingresos'
                        WHEN tipo = 'G' THEN 'gastos'
                    END as categoria,
                    SUM(total) as total_monto,
                    COUNT(*) as cantidad
                FROM transacciones ${whereClause}
                GROUP BY tipo
            `;

            const resultados = await executeQuery(resumenQuery, params);
            
            // Procesar resultados para formato esperado por el frontend
            const resumen = {
                ingresos: 0,
                gastos: 0,
                balance: 0,
                total_transacciones: 0
            };

            resultados.forEach(row => {
                if (row.categoria === 'ingresos') {
                    resumen.ingresos = parseFloat(row.total_monto) || 0;
                    resumen.total_transacciones += row.cantidad || 0;
                } else if (row.categoria === 'gastos') {
                    resumen.gastos = parseFloat(row.total_monto) || 0;
                    resumen.total_transacciones += row.cantidad || 0;
                }
            });

            // Calcular balance
            resumen.balance = resumen.ingresos - resumen.gastos;

            // Obtener detalles adicionales
            const detallesQuery = `
                SELECT 
                    COUNT(*) as total_transacciones_detalle,
                    MIN(fecha) as fecha_primera,
                    MAX(fecha) as fecha_ultima,
                    COUNT(DISTINCT socio) as total_socios,
                    COUNT(DISTINCT empresa_id) as total_empresas
                FROM transacciones ${whereClause}
            `;

            const detalles = await executeQuery(detallesQuery, params);
            
            if (detalles && detalles.length > 0) {
                resumen.fecha_primera = detalles[0].fecha_primera;
                resumen.fecha_ultima = detalles[0].fecha_ultima;
                resumen.total_socios = detalles[0].total_socios || 0;
                resumen.total_empresas = detalles[0].total_empresas || 0;
                // Usar el conteo detallado si es diferente
                resumen.total_transacciones = detalles[0].total_transacciones_detalle || resumen.total_transacciones;
            }

            console.log('📊 Resumen calculado:', {
                ingresos: resumen.ingresos,
                gastos: resumen.gastos,
                balance: resumen.balance,
                transacciones: resumen.total_transacciones
            });

            res.json({
                success: true,
                data: resumen,
                filtros_aplicados: {
                    empresa_id: empresa_id || null,
                    fecha_inicio: fechaInicio || null,
                    fecha_fin: fechaFin || null
                }
            });

        } catch (error) {
            console.error('❌ Error al obtener resumen:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    },
    
    // Obtener solo gastos
    getGastos: async (req, res) => {
        req.query.tipo = 'G';
        return transaccionesController.getTransacciones(req, res);
    },

    // Obtener solo ingresos
    getIngresos: async (req, res) => {
        req.query.tipo = 'I';
        return transaccionesController.getTransacciones(req, res);
    },

    // Crear gasto
    createGasto: async (req, res) => {
        req.body.tipo = 'G';
        return transaccionesController.createTransaccion(req, res);
    },

    // Crear ingreso
    createIngreso: async (req, res) => {
        req.body.tipo = 'I';
        return transaccionesController.createTransaccion(req, res);
    },

    // Obtener empresas (utilidad)
    getEmpresas: async (req, res) => {
        try {
            const empresas = await executeQuery(
                'SELECT id, nombre, tipo_negocio FROM empresas WHERE activa = TRUE ORDER BY nombre'
            );

            res.json({
                success: true,
                data: empresas
            });

        } catch (error) {
            console.error('Error al obtener empresas:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },
    // ====================================================
    // NUEVAS FUNCIONES PARA ENDPOINTS FALTANTES
    // ====================================================

    // Obtener estadísticas de alumnos para dashboard
    getDashboardAlumnos: async (req, res) => {
        try {
            const { empresa_id } = req.query;
            let whereClause = 'WHERE 1=1';
            const params = [];

            if (empresa_id) {
                whereClause += ' AND empresa_id = ?';
                params.push(empresa_id);
            }

            // 1. Estadísticas básicas de alumnos
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_alumnos,
                    COUNT(CASE WHEN estatus = 'Activo' THEN 1 END) as alumnos_activos,
                    COUNT(CASE WHEN estatus = 'Baja' THEN 1 END) as alumnos_bajas,
                    ROUND(AVG(precio_mensual), 2) as precio_promedio
                FROM alumnos 
                ${whereClause}
            `;

            const [estadisticas] = await executeQuery(statsQuery, params);

            // 2. Distribución por clases
            const clasesQuery = `
                SELECT 
                    clase,
                    COUNT(*) as total_alumnos,
                    COUNT(CASE WHEN estatus = 'Activo' THEN 1 END) as activos,
                    ROUND(AVG(precio_mensual), 2) as precio_promedio
                FROM alumnos 
                ${whereClause}
                GROUP BY clase
                ORDER BY total_alumnos DESC
            `;

            const distribucionClases = await executeQuery(clasesQuery, params);

            // 3. Distribución por maestros (si existe la relación)
            const maestrosQuery = `
                SELECT 
                    COALESCE(m.nombre, 'Sin Maestro') as maestro,
                    COUNT(a.id) as total_alumnos,
                    COUNT(CASE WHEN a.estatus = 'Activo' THEN 1 END) as activos
                FROM alumnos a
                LEFT JOIN maestros m ON a.maestro_id = m.id
                ${whereClause.replace('WHERE', 'WHERE')}
                GROUP BY m.id, m.nombre
                ORDER BY total_alumnos DESC
            `;

            const distribucionMaestros = await executeQuery(maestrosQuery, params);

            // 4. Ingresos mensuales estimados
            const ingresosMensualesQuery = `
                SELECT 
                    SUM(CASE WHEN estatus = 'Activo' THEN precio_mensual ELSE 0 END) as ingresos_estimados,
                    COUNT(CASE WHEN estatus = 'Activo' AND fecha_ultimo_pago >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as pagos_recientes
                FROM alumnos 
                ${whereClause}
            `;

            const [ingresosMensuales] = await executeQuery(ingresosMensualesQuery, params);

            res.json({
                success: true,
                data: {
                    estadisticas: {
                        total_alumnos: estadisticas.total_alumnos || 0,
                        alumnos_activos: estadisticas.alumnos_activos || 0,
                        alumnos_bajas: estadisticas.alumnos_bajas || 0,
                        precio_promedio: estadisticas.precio_promedio || 0,
                        tasa_actividad: estadisticas.total_alumnos > 0 ? 
                            Math.round((estadisticas.alumnos_activos / estadisticas.total_alumnos) * 100) : 0
                    },
                    distribucion_clases: distribucionClases,
                    distribucion_maestros: distribucionMaestros,
                    ingresos_mensuales: {
                        estimados: ingresosMensuales.ingresos_estimados || 0,
                        pagos_recientes: ingresosMensuales.pagos_recientes || 0
                    }
                }
            });

            console.log(`✅ Dashboard alumnos consultado - Empresa: ${empresa_id || 'Todas'}`);

        } catch (error) {
            console.error('Error al obtener estadísticas de alumnos:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor',
                error: error.message 
            });
        }
    },

    // Obtener datos para gráfica de gastos
    getGastosGrafica: async (req, res) => {
        try {
            const { 
                empresa_id, 
                año = new Date().getFullYear(),
                vista = 'month' // 'month' o 'year'
            } = req.query;

            let whereClause = "WHERE tipo = 'G'";
            const params = ['G'];

            if (empresa_id) {
                whereClause += ' AND empresa_id = ?';
                params.push(empresa_id);
            }

            if (vista === 'month') {
                // Vista mensual para el año especificado
                whereClause += ' AND YEAR(fecha) = ?';
                params.push(año);

                const gastosQuery = `
                    SELECT 
                        DATE_FORMAT(fecha, '%Y-%m') as periodo,
                        MONTHNAME(fecha) as mes_nombre,
                        COUNT(*) as total_transacciones,
                        SUM(total) as total_gastos,
                        ROUND(AVG(total), 2) as promedio_gasto
                    FROM transacciones 
                    ${whereClause}
                    GROUP BY DATE_FORMAT(fecha, '%Y-%m'), MONTHNAME(fecha)
                    ORDER BY periodo ASC
                `;

                const gastosPorMes = await executeQuery(gastosQuery, params);

                // Asegurar que tenemos todos los 12 meses
                const mesesCompletos = [];
                const mesesNombres = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                ];

                for (let mes = 1; mes <= 12; mes++) {
                    const mesFormato = `${año}-${mes.toString().padStart(2, '0')}`;
                    const datosMes = gastosPorMes.find(g => g.periodo === mesFormato);
                    
                    mesesCompletos.push({
                        periodo: mesFormato,
                        mes_nombre: mesesNombres[mes - 1],
                        total_transacciones: datosMes?.total_transacciones || 0,
                        total_gastos: datosMes?.total_gastos || 0,
                        promedio_gasto: datosMes?.promedio_gasto || 0
                    });
                }

                res.json({
                    success: true,
                    data: {
                        vista: 'monthly',
                        año: parseInt(año),
                        gastos_por_mes: mesesCompletos,
                        resumen: {
                            total_gastos: mesesCompletos.reduce((sum, mes) => sum + (mes.total_gastos || 0), 0),
                            total_transacciones: mesesCompletos.reduce((sum, mes) => sum + (mes.total_transacciones || 0), 0),
                            promedio_mensual: Math.round(mesesCompletos.reduce((sum, mes) => sum + (mes.total_gastos || 0), 0) / 12)
                        }
                    }
                });

            } else if (vista === 'year') {
                // Vista anual (últimos 5 años)
                const añoActual = new Date().getFullYear();
                whereClause += ' AND YEAR(fecha) >= ?';
                params.push(añoActual - 4); // Últimos 5 años

                const gastosQuery = `
                    SELECT 
                        YEAR(fecha) as año,
                        COUNT(*) as total_transacciones,
                        SUM(total) as total_gastos,
                        ROUND(AVG(total), 2) as promedio_gasto
                    FROM transacciones 
                    ${whereClause}
                    GROUP BY YEAR(fecha)
                    ORDER BY año ASC
                `;

                const gastosPorAño = await executeQuery(gastosQuery, params);

                res.json({
                    success: true,
                    data: {
                        vista: 'yearly',
                        gastos_por_año: gastosPorAño,
                        resumen: {
                            total_gastos: gastosPorAño.reduce((sum, año) => sum + (año.total_gastos || 0), 0),
                            total_transacciones: gastosPorAño.reduce((sum, año) => sum + (año.total_transacciones || 0), 0)
                        }
                    }
                });
            }

            console.log(`✅ Gráfica de gastos generada - Vista: ${vista}, Año: ${año}`);

        } catch (error) {
            console.error('Error al generar gráfica de gastos:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor',
                error: error.message 
            });
        }
    },
    // ====================================================
    // FUNCIONES PARA GESTIÓN DE ALUMNOS
    // ====================================================

    // Obtener todos los alumnos con filtros
    getAlumnos: async (req, res) => {
        try {
            const { 
                empresa_id, 
                estatus, 
                clase,
                maestro_id,
                page = 1, 
                limit = 50 
            } = req.query;

            let query = `
                SELECT a.*, 
                       m.nombre as maestro_nombre,
                       e.nombre as empresa_nombre
                FROM alumnos a 
                LEFT JOIN maestros m ON a.maestro_id = m.id
                LEFT JOIN empresas e ON a.empresa_id = e.id
                WHERE 1=1
            `;
            const params = [];

            if (empresa_id) {
                query += ' AND a.empresa_id = ?';
                params.push(empresa_id);
            }

            if (estatus) {
                query += ' AND a.estatus = ?';
                params.push(estatus);
            }

            if (clase) {
                query += ' AND a.clase LIKE ?';
                params.push(`%${clase}%`);
            }

            if (maestro_id) {
                query += ' AND a.maestro_id = ?';
                params.push(maestro_id);
            }

            query += ' ORDER BY a.nombre ASC';

            // Paginación
            const offset = (page - 1) * limit;
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const alumnos = await executeQuery(query, params);

            // Contar total
            let countQuery = `SELECT COUNT(*) as total FROM alumnos a WHERE 1=1`;
            const countParams = params.slice(0, -2);

            if (empresa_id) countQuery += ' AND a.empresa_id = ?';
            if (estatus) countQuery += ' AND a.estatus = ?';
            if (clase) countQuery += ' AND a.clase LIKE ?';
            if (maestro_id) countQuery += ' AND a.maestro_id = ?';

            const [{ total }] = await executeQuery(countQuery, countParams);

            res.json({
                success: true,
                data: alumnos,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total),
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Error al obtener alumnos:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // Crear nuevo alumno
    createAlumno: async (req, res) => {
        try {
            const {
                nombre,
                edad,
                telefono,
                email,
                clase,
                maestro_id,
                horario,
                fecha_inscripcion,
                precio_mensual,
                forma_pago,
                empresa_id,
                promocion,
                tipo_clase,
                domiciliado
            } = req.body;

            // Validaciones
            if (!nombre || !clase || !fecha_inscripcion || !precio_mensual || !empresa_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos requeridos: nombre, clase, fecha_inscripcion, precio_mensual, empresa_id'
                });
            }

            const query = `
                INSERT INTO alumnos (
                    nombre, edad, telefono, email, clase, maestro_id,
                    horario, fecha_inscripcion, precio_mensual, forma_pago,
                    empresa_id, promocion, tipo_clase, domiciliado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const result = await executeQuery(query, [
                nombre, edad, telefono, email, clase, maestro_id,
                horario, fecha_inscripcion, precio_mensual, forma_pago,
                empresa_id, promocion, tipo_clase, domiciliado || false
            ]);

            // Obtener el alumno recién creado
            const nuevoAlumno = await executeQuery(`
                SELECT a.*, m.nombre as maestro_nombre, e.nombre as empresa_nombre
                FROM alumnos a 
                LEFT JOIN maestros m ON a.maestro_id = m.id
                LEFT JOIN empresas e ON a.empresa_id = e.id
                WHERE a.id = ?
            `, [result.insertId]);

            console.log(`✅ Nuevo alumno creado: ${nombre} - ${clase}`);

            res.status(201).json({ 
                success: true, 
                message: 'Alumno creado exitosamente',
                data: nuevoAlumno[0]
            });

        } catch (error) {
            console.error('Error al crear alumno:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // Actualizar alumno
    updateAlumno: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                nombre, edad, telefono, email, clase, maestro_id,
                horario, precio_mensual, forma_pago, estatus,
                promocion, tipo_clase, domiciliado
            } = req.body;

            // Verificar que existe
            const existe = await executeQuery('SELECT id FROM alumnos WHERE id = ?', [id]);
            if (existe.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Alumno no encontrado'
                });
            }

            const query = `
                UPDATE alumnos SET 
                    nombre = ?, edad = ?, telefono = ?, email = ?, clase = ?,
                    maestro_id = ?, horario = ?, precio_mensual = ?, forma_pago = ?,
                    estatus = ?, promocion = ?, tipo_clase = ?, domiciliado = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await executeQuery(query, [
                nombre, edad, telefono, email, clase, maestro_id,
                horario, precio_mensual, forma_pago, estatus,
                promocion, tipo_clase, domiciliado, id
            ]);

            console.log(`✅ Alumno ${id} actualizado: ${nombre}`);

            res.json({ 
                success: true, 
                message: 'Alumno actualizado exitosamente' 
            });

        } catch (error) {
            console.error('Error al actualizar alumno:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // Eliminar alumno (soft delete)
    deleteAlumno: async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar que existe
            const alumno = await executeQuery('SELECT nombre FROM alumnos WHERE id = ?', [id]);
            if (alumno.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Alumno no encontrado'
                });
            }

            // Soft delete - marcar como baja
            await executeQuery(`
                UPDATE alumnos 
                SET estatus = 'Baja', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [id]);

            console.log(`✅ Alumno dado de baja: ${alumno[0].nombre}`);

            res.json({ 
                success: true, 
                message: 'Alumno dado de baja exitosamente' 
            });

        } catch (error) {
            console.error('Error al dar de baja alumno:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // ====================================================
    // FUNCIONES PARA PAGOS MENSUALES
    // ====================================================

    // Obtener pagos mensuales con filtros
    getPagosMensuales: async (req, res) => {
        try {
            const { 
                alumno_id, 
                año, 
                mes,
                empresa_id,
                page = 1, 
                limit = 50 
            } = req.query;

            let query = `
                SELECT pm.*, 
                       a.nombre as alumno_nombre,
                       a.clase as alumno_clase,
                       e.nombre as empresa_nombre
                FROM pagos_mensuales pm
                JOIN alumnos a ON pm.alumno_id = a.id
                JOIN empresas e ON a.empresa_id = e.id
                WHERE 1=1
            `;
            const params = [];

            if (alumno_id) {
                query += ' AND pm.alumno_id = ?';
                params.push(alumno_id);
            }

            if (año) {
                query += ' AND pm.año = ?';
                params.push(año);
            }

            if (mes) {
                query += ' AND pm.mes = ?';
                params.push(mes);
            }

            if (empresa_id) {
                query += ' AND a.empresa_id = ?';
                params.push(empresa_id);
            }

            query += ' ORDER BY pm.año DESC, pm.mes DESC, a.nombre ASC';

            // Paginación
            const offset = (page - 1) * limit;
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));

            const pagos = await executeQuery(query, params);

            // Contar total
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM pagos_mensuales pm
                JOIN alumnos a ON pm.alumno_id = a.id
                WHERE 1=1
            `;
            const countParams = params.slice(0, -2);

            if (alumno_id) countQuery += ' AND pm.alumno_id = ?';
            if (año) countQuery += ' AND pm.año = ?';
            if (mes) countQuery += ' AND pm.mes = ?';
            if (empresa_id) countQuery += ' AND a.empresa_id = ?';

            const [{ total }] = await executeQuery(countQuery, countParams);

            res.json({
                success: true,
                data: pagos,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(total),
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Error al obtener pagos mensuales:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // Registrar pago mensual
    createPagoMensual: async (req, res) => {
        try {
            const {
                alumno_id,
                año,
                mes,
                monto_pagado,
                fecha_pago,
                metodo_pago,
                notas
            } = req.body;

            // Validaciones
            if (!alumno_id || !año || !mes || !monto_pagado) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan campos requeridos: alumno_id, año, mes, monto_pagado'
                });
            }

            // Verificar que el alumno existe
            const alumno = await executeQuery('SELECT nombre FROM alumnos WHERE id = ?', [alumno_id]);
            if (alumno.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Alumno no encontrado'
                });
            }

            const query = `
                INSERT INTO pagos_mensuales (
                    alumno_id, año, mes, monto_pagado, fecha_pago, metodo_pago, notas
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    monto_pagado = VALUES(monto_pagado),
                    fecha_pago = VALUES(fecha_pago),
                    metodo_pago = VALUES(metodo_pago),
                    notas = VALUES(notas)
            `;

            await executeQuery(query, [
                alumno_id, año, mes, monto_pagado, fecha_pago, metodo_pago, notas
            ]);

            // Actualizar fecha_ultimo_pago en tabla alumnos
            await executeQuery(`
                UPDATE alumnos 
                SET fecha_ultimo_pago = ?
                WHERE id = ?
            `, [fecha_pago, alumno_id]);

            console.log(`✅ Pago registrado: ${alumno[0].nombre} - ${año}/${mes}`);

            res.status(201).json({ 
                success: true, 
                message: 'Pago mensual registrado exitosamente'
            });

        } catch (error) {
            console.error('Error al registrar pago mensual:', error);
            
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un pago registrado para este alumno en este período'
                });
            }
            
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    },

    // Obtener histórico de pagos por alumno
    getHistoricoPagos: async (req, res) => {
        try {
            const { alumno_id } = req.params;
            const { año_inicio, año_fin } = req.query;

            let query = `
                SELECT pm.*, a.nombre as alumno_nombre, a.precio_mensual
                FROM pagos_mensuales pm
                JOIN alumnos a ON pm.alumno_id = a.id
                WHERE pm.alumno_id = ?
            `;
            const params = [alumno_id];

            if (año_inicio) {
                query += ' AND pm.año >= ?';
                params.push(año_inicio);
            }

            if (año_fin) {
                query += ' AND pm.año <= ?';
                params.push(año_fin);
            }

            query += ' ORDER BY pm.año ASC, pm.mes ASC';

            const pagos = await executeQuery(query, params);

            // Estadísticas del alumno
            const estadisticas = await executeQuery(`
                SELECT 
                    COUNT(*) as total_pagos,
                    SUM(monto_pagado) as total_pagado,
                    AVG(monto_pagado) as promedio_pago,
                    MIN(fecha_pago) as primer_pago,
                    MAX(fecha_pago) as ultimo_pago
                FROM pagos_mensuales 
                WHERE alumno_id = ?
            `, [alumno_id]);

            res.json({
                success: true,
                data: {
                    pagos: pagos,
                    estadisticas: estadisticas[0] || {}
                }
            });

        } catch (error) {
            console.error('Error al obtener histórico de pagos:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error interno del servidor' 
            });
        }
    }
};

// Función para gráfica de gastos (AGREGAR ESTA FUNCIÓN)
getGastosGrafica: async (req, res) => {
    try {
        const { empresa_id, año, vista = 'month' } = req.query;
        
        let whereClause = 'WHERE tipo = "G"';
        let params = [];
        
        if (empresa_id) {
            whereClause += ' AND empresa_id = ?';
            params.push(empresa_id);
        }
        
        if (año) {
            whereClause += ' AND YEAR(fecha) = ?';
            params.push(año);
        }
        
        const query = `
            SELECT 
                DATE_FORMAT(fecha, '%Y-%m') as periodo,
                SUM(total) as total_gastos,
                COUNT(*) as total_transacciones,
                AVG(total) as promedio_gasto
            FROM transacciones 
            ${whereClause}
            GROUP BY DATE_FORMAT(fecha, '%Y-%m')
            ORDER BY periodo ASC
        `;
        
        const result = await executeQuery(query, params);
        
        res.json({
            success: true,
            data: {
                datos: result,
                totales: {
                    total_gastos: result.reduce((sum, item) => sum + parseFloat(item.total_gastos), 0),
                    total_transacciones: result.reduce((sum, item) => sum + parseInt(item.total_transacciones), 0),
                    promedio_gasto: result.length > 0 ? result.reduce((sum, item) => sum + parseFloat(item.promedio_gasto), 0) / result.length : 0
                },
                periodo_consultado: año ? `Año ${año}` : 'Últimos 12 meses'
            }
        });
        
    } catch (error) {
        console.error('Error en getGastosGrafica:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}

export default transaccionesController;