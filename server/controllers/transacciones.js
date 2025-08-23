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
                limit = 50 
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
    }
};

export default transaccionesController;