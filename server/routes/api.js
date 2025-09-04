// ====================================================
// RUTAS API - TRANSACCIONES, GASTOS E INGRESOS
// Archivo: server/routes/api.js
// ====================================================

import express from 'express';
import { transaccionesController } from '../controllers/transacciones.js';
import { executeQuery } from '../config/database.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas API
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.status(401).json({
            success: false,
            error: 'Acceso no autorizado'
        });
    }
}

// Aplicar middleware de autenticación a todas las rutas
router.use(requireAuth);

// ==================== RUTAS DE TRANSACCIONES ====================
// GET /api/transacciones - Todas las transacciones con filtros
router.get('/transacciones', transaccionesController.getTransacciones);

// POST /api/transacciones - Crear nueva transacción
router.post('/transacciones', transaccionesController.createTransaccion);

// PUT /api/transacciones/:id - Actualizar transacción
router.put('/transacciones/:id', transaccionesController.updateTransaccion);

// DELETE /api/transacciones/:id - Eliminar transacción
router.delete('/transacciones/:id', transaccionesController.deleteTransaccion);

// GET /api/transacciones/resumen - Resumen de todas las transacciones
router.get('/transacciones/resumen', transaccionesController.getResumen);

// ==================== RUTAS ESPECÍFICAS DE GASTOS ====================
// GET /api/gastos - Solo gastos (tipo = 'G')
router.get('/gastos', transaccionesController.getGastos);

// POST /api/gastos - Crear nuevo gasto
router.post('/gastos', transaccionesController.createGasto);

// ==================== RUTAS ESPECÍFICAS DE INGRESOS ====================
// GET /api/ingresos - Solo ingresos (tipo = 'I')
router.get('/ingresos', transaccionesController.getIngresos);

// POST /api/ingresos - Crear nuevo ingreso
router.post('/ingresos', transaccionesController.createIngreso);

// ==================== RUTAS DE DATOS AUXILIARES ====================
// GET /api/empresas - Lista de empresas
router.get('/empresas', transaccionesController.getEmpresas);

// ✅ NUEVO: Historial de pagos de alumno específico
router.get('/alumnos/:alumnoNombre/historial-pagos', transaccionesController.getHistorialPagosAlumno);

// ==================== RUTAS DE REPORTES DASHBOARD ====================
// GET /api/dashboard - Datos para dashboard principal
// GET /api/dashboard - Datos para dashboard principal COMPLETO
router.get('/dashboard', async (req, res) => {
    try {
        const { empresa_id, periodo = '12' } = req.query;
        
        let whereClause = 'WHERE 1=1';
        let params = [];
        
        if (empresa_id) {
            whereClause += ' AND empresa_id = ?';
            params.push(empresa_id);
        }
        
        // Período en meses hacia atrás
        whereClause += ' AND fecha >= DATE_SUB(NOW(), INTERVAL ? MONTH)';
        params.push(parseInt(periodo));
        
        // Obtener resumen de transacciones
        const resumenQuery = `
            SELECT 
                COUNT(*) as total_transacciones,
                SUM(CASE WHEN tipo = 'I' THEN total ELSE 0 END) as total_ingresos,
                SUM(CASE WHEN tipo = 'G' THEN total ELSE 0 END) as total_gastos,
                COUNT(CASE WHEN tipo = 'I' THEN 1 END) as count_ingresos,
                COUNT(CASE WHEN tipo = 'G' THEN 1 END) as count_gastos
            FROM transacciones ${whereClause}
        `;
        
        const [resumen] = await executeQuery(resumenQuery, params);
        
        // Datos mensuales para gráficas
        const tendenciaQuery = `
            SELECT 
                DATE_FORMAT(fecha, '%Y-%m') as mes,
                DATE_FORMAT(fecha, '%M %Y') as mes_label,
                SUM(CASE WHEN tipo = 'I' THEN total ELSE 0 END) as ingresos,
                SUM(CASE WHEN tipo = 'G' THEN total ELSE 0 END) as gastos,
                COUNT(*) as transacciones
            FROM transacciones ${whereClause}
            GROUP BY DATE_FORMAT(fecha, '%Y-%m')
            ORDER BY DATE_FORMAT(fecha, '%Y-%m') ASC
        `;
        
        const tendenciaMensual = await executeQuery(tendenciaQuery, params);
        
        // Top categorías de gastos
        const topGastosQuery = `
            SELECT 
                concepto,
                COUNT(*) as cantidad,
                SUM(total) as total_gastado,
                AVG(total) as promedio
            FROM transacciones 
            ${whereClause} AND tipo = 'G'
            GROUP BY concepto
            ORDER BY total_gastado DESC
            LIMIT 5
        `;
        
        const topGastos = await executeQuery(topGastosQuery, params);
        
        // Calcular balance y métricas
        const totalIngresos = parseFloat(resumen.total_ingresos || 0);
        const totalGastos = parseFloat(resumen.total_gastos || 0);
        const balance = totalIngresos - totalGastos;
        const margenPorcentaje = totalIngresos > 0 ? 
            Math.round((balance / totalIngresos) * 100) : 0;
        
        res.json({
            success: true,
            data: {
                resumen: {
                    total_transacciones: parseInt(resumen.total_transacciones || 0),
                    total_ingresos: totalIngresos,
                    total_gastos: totalGastos,
                    balance: balance,
                    margen_porcentaje: margenPorcentaje,
                    count_ingresos: parseInt(resumen.count_ingresos || 0),
                    count_gastos: parseInt(resumen.count_gastos || 0)
                },
                tendencia_mensual: tendenciaMensual,
                top_gastos: topGastos,
                periodo_consultado: `Últimos ${periodo} meses`
            }
        });
        
        console.log(`✅ Dashboard consultado - Empresa: ${empresa_id || 'Todas'}, Período: ${periodo} meses`);
        
    } catch (error) {
        console.error('Error obteniendo datos de dashboard:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// GET /api/dashboard/alumnos - Estadísticas de alumnos para dashboard
router.get('/dashboard/alumnos', transaccionesController.getDashboardAlumnos);

// ============================================================
// RUTAS ESPECÍFICAS DE GASTOS
// ============================================================

/* GET /api/gastos/grafica - Datos para gráfica principal de gastos
router.get('/gastos/grafica', async (req, res) => {
    try {
        const { empresa_id, año, periodo = 12 } = req.query;
        
        let whereClause = 'WHERE tipo = "G"'; // Solo gastos
        let params = [];
        
        if (empresa_id) {
            whereClause += ' AND empresa_id = ?';
            params.push(empresa_id);
        }
        
        if (año) {
            whereClause += ' AND YEAR(fecha) = ?';
            params.push(año);
        } else {
            // Por defecto últimos 12 meses
            whereClause += ' AND fecha >= DATE_SUB(NOW(), INTERVAL ? MONTH)';
            params.push(parseInt(periodo));
        }
        
        // Datos por mes para la gráfica
        const gastosPorMes = await executeQuery(`
            SELECT 
                DATE_FORMAT(fecha, '%Y-%m') as periodo,
                DATE_FORMAT(fecha, '%M %Y') as periodo_label,
                YEAR(fecha) as año,
                MONTH(fecha) as mes,
                COUNT(*) as total_transacciones,
                SUM(total) as total_gastos,
                AVG(total) as promedio_gasto
            FROM transacciones 
            ${whereClause}
            GROUP BY DATE_FORMAT(fecha, '%Y-%m')
            ORDER BY fecha DESC
            LIMIT 12
        `, params);
        
        // Totales generales
        const totales = await executeQuery(`
            SELECT 
                COUNT(*) as total_transacciones,
                SUM(total) as total_gastos,
                AVG(total) as promedio_gasto,
                MIN(total) as gasto_minimo,
                MAX(total) as gasto_maximo
            FROM transacciones 
            ${whereClause}
        `, params);
        
        // Top 5 categorías de gastos
        const topCategorias = await executeQuery(`
            SELECT 
                socio,
                COUNT(*) as cantidad,
                SUM(total) as total_gastos,
                ROUND(AVG(total), 2) as promedio
            FROM transacciones 
            ${whereClause}
            GROUP BY socio
            ORDER BY total_gastos DESC
            LIMIT 5
        `, params);
        
        res.json({
            success: true,
            data: {
                gastos_por_mes: gastosPorMes.reverse(), // Orden cronológico
                totales: totales[0] || {},
                top_categorias: topCategorias,
                periodo_consultado: año || `Últimos ${periodo} meses`
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo datos de gráfica:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});*/

// GET /api/gastos/drill-down - Drill-down por año/mes
router.get('/gastos/drill-down', async (req, res) => {
    try {
        const { empresa_id, año, mes, socio } = req.query;
        
        let whereClause = 'WHERE tipo = "G"';
        let params = [];
        
        if (empresa_id) {
            whereClause += ' AND empresa_id = ?';
            params.push(empresa_id);
        }
        
        if (año) {
            whereClause += ' AND YEAR(fecha) = ?';
            params.push(año);
            
            if (mes) {
                whereClause += ' AND MONTH(fecha) = ?';
                params.push(mes);
            }
        }
        
        if (socio) {
            whereClause += ' AND socio = ?';
            params.push(socio);
        }
        
        // Si tenemos año y mes, mostrar gastos detallados
        if (año && mes) {
            const gastosDetalle = await executeQuery(`
                SELECT 
                    id,
                    fecha,
                    concepto,
                    socio,
                    empresa_id,
                    forma_pago,
                    cantidad,
                    precio_unitario,
                    total,
                    created_at
                FROM transacciones 
                ${whereClause}
                ORDER BY fecha DESC, total DESC
            `, params);
            
            const resumenMes = await executeQuery(`
                SELECT 
                    COUNT(*) as total_transacciones,
                    SUM(total) as total_gastos,
                    AVG(total) as promedio_gasto
                FROM transacciones 
                ${whereClause}
            `, params);
            
            return res.json({
                success: true,
                data: {
                    tipo: 'detalle',
                    gastos: gastosDetalle,
                    resumen: resumenMes[0] || {},
                    periodo: `${mes}/${año}`
                }
            });
        }
        
        // Si solo tenemos año, mostrar por meses
        if (año) {
            const gastosPorMes = await executeQuery(`
                SELECT 
                    MONTH(fecha) as mes,
                    MONTHNAME(fecha) as mes_nombre,
                    COUNT(*) as total_transacciones,
                    SUM(total) as total_gastos
                FROM transacciones 
                ${whereClause}
                GROUP BY MONTH(fecha), MONTHNAME(fecha)
                ORDER BY MONTH(fecha)
            `, params);
            
            return res.json({
                success: true,
                data: {
                    tipo: 'mensual',
                    gastos_por_mes: gastosPorMes,
                    año: año
                }
            });
        }
        
        // Por defecto, mostrar por años
        const gastosPorAño = await executeQuery(`
            SELECT 
                YEAR(fecha) as año,
                COUNT(*) as total_transacciones,
                SUM(total) as total_gastos
            FROM transacciones 
            ${whereClause}
            GROUP BY YEAR(fecha)
            ORDER BY YEAR(fecha) DESC
        `, params);
        
        res.json({
            success: true,
            data: {
                tipo: 'anual',
                gastos_por_año: gastosPorAño
            }
        });
        
    } catch (error) {
        console.error('Error en drill-down:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// GET /api/gastos/filtros - Datos para filtros dinámicos
router.get('/gastos/filtros', async (req, res) => {
    try {
        // Obtener todas las opciones disponibles para filtros
        
        // Socios únicos
        const socios = await executeQuery(`
            SELECT DISTINCT socio 
            FROM transacciones 
            WHERE tipo = "G" AND socio IS NOT NULL AND socio != ""
            ORDER BY socio
        `);
        
        // Formas de pago únicas
        const formasPago = await executeQuery(`
            SELECT DISTINCT forma_pago 
            FROM transacciones 
            WHERE tipo = "G" AND forma_pago IS NOT NULL AND forma_pago != ""
            ORDER BY forma_pago
        `);
        
        // Años disponibles
        const años = await executeQuery(`
            SELECT DISTINCT YEAR(fecha) as año
            FROM transacciones 
            WHERE tipo = "G"
            ORDER BY YEAR(fecha) DESC
        `);
        
        // Empresas con gastos
        const empresas = await executeQuery(`
            SELECT DISTINCT e.id, e.nombre
            FROM empresas e
            INNER JOIN transacciones t ON e.id = t.empresa_id
            WHERE t.tipo = "G"
            ORDER BY e.nombre
        `);
        
        // Rangos de montos (para filtros avanzados)
        const rangosMontos = await executeQuery(`
            SELECT 
                MIN(total) as monto_minimo,
                MAX(total) as monto_maximo,
                AVG(total) as monto_promedio,
                COUNT(*) as total_gastos
            FROM transacciones 
            WHERE tipo = "G"
        `);
        
        res.json({
            success: true,
            data: {
                socios: socios.map(s => s.socio),
                formas_pago: formasPago.map(f => f.forma_pago),
                años: años.map(a => a.año),
                empresas: empresas,
                rangos_montos: rangosMontos[0] || {},
                total_opciones: {
                    socios: socios.length,
                    formas_pago: formasPago.length,
                    años: años.length,
                    empresas: empresas.length
                }
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo filtros:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// POST /api/gastos/bulk-delete - Eliminación masiva (solo admins)
router.post('/gastos/bulk-delete', requireAuth, async (req, res) => {
    try {
        const { transaction_ids } = req.body;
        const user = req.session.user;
        
        // Verificar permisos de admin
        if (user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Acceso denegado. Solo administradores pueden eliminar masivamente.'
            });
        }
        
        if (!transaction_ids || !Array.isArray(transaction_ids) || transaction_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de IDs de transacciones'
            });
        }
        
        // Verificar que todas las transacciones sean gastos
        const placeholders = transaction_ids.map(() => '?').join(',');
        const transactionsToDelete = await executeQuery(`
            SELECT id, concepto, total, tipo, socio
            FROM transacciones 
            WHERE id IN (${placeholders}) AND tipo = 'G'
        `, transaction_ids);
        
        if (transactionsToDelete.length !== transaction_ids.length) {
            return res.status(400).json({
                success: false,
                error: 'Algunas transacciones no existen o no son gastos'
            });
        }
        
        // Eliminar transacciones
        const result = await executeQuery(`
            DELETE FROM transacciones 
            WHERE id IN (${placeholders}) AND tipo = 'G'
        `, transaction_ids);
        
        console.log(`🗑️ ${user.nombre} eliminó ${result.affectedRows} gastos masivamente`);
        
        res.json({
            success: true,
            message: `${result.affectedRows} gastos eliminados exitosamente`,
            data: {
                eliminados: result.affectedRows,
                transacciones: transactionsToDelete
            }
        });
        
    } catch (error) {
        console.error('Error en eliminación masiva:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// POST /api/transacciones - Crear nueva transacción
router.post('/transacciones', requireAuth, async (req, res) => {
    try {
        const {
            fecha,
            concepto,
            socio,
            empresa_id,
            forma_pago,
            cantidad,
            precio_unitario,
            tipo = 'G' // Por defecto gasto
        } = req.body;
        
        const user = req.session.user;
        
        // Validaciones básicas
        if (!fecha || !concepto || !socio || !empresa_id || !forma_pago || !cantidad || !precio_unitario) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos'
            });
        }
        
        // Insertar transacción
        const result = await executeQuery(`
            INSERT INTO transacciones (
                fecha, concepto, socio, empresa_id, forma_pago,
                cantidad, precio_unitario, tipo, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, user.id]);
        
        console.log(`✅ ${user.nombre} creó nueva transacción: ${concepto} - $${cantidad * precio_unitario}`);
        
        res.json({
            success: true,
            message: 'Transacción creada exitosamente',
            data: {
                id: result.insertId,
                total: cantidad * precio_unitario
            }
        });
        
    } catch (error) {
        console.error('Error creando transacción:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// PUT /api/transacciones/:id - Actualizar transacción
router.put('/transacciones/:id', requireAuth, async (req, res) => {
    try {
        const transactionId = req.params.id;
        const {
            fecha,
            concepto,
            socio,
            empresa_id,
            forma_pago,
            cantidad,
            precio_unitario,
            tipo
        } = req.body;
        
        const user = req.session.user;
        
        // Verificar que la transacción existe
        const existingTransaction = await executeQuery(
            'SELECT * FROM transacciones WHERE id = ?',
            [transactionId]
        );
        
        if (existingTransaction.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Transacción no encontrada'
            });
        }
        
        // Actualizar transacción
        await executeQuery(`
            UPDATE transacciones SET
                fecha = ?, concepto = ?, socio = ?, empresa_id = ?,
                forma_pago = ?, cantidad = ?, precio_unitario = ?, tipo = ?
            WHERE id = ?
        `, [fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, transactionId]);
        
        console.log(`✅ ${user.nombre} actualizó transacción ${transactionId}: ${concepto}`);
        
        res.json({
            success: true,
            message: 'Transacción actualizada exitosamente',
            data: {
                id: transactionId,
                total: cantidad * precio_unitario
            }
        });
        
    } catch (error) {
        console.error('Error actualizando transacción:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// DELETE /api/transacciones/:id - Eliminar transacción
router.delete('/transacciones/:id', requireAuth, async (req, res) => {
    try {
        const transactionId = req.params.id;
        const user = req.session.user;
        
        // Verificar permisos (solo admins pueden eliminar)
        if (user.rol !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden eliminar transacciones'
            });
        }
        
        // Verificar que la transacción existe
        const transaction = await executeQuery(
            'SELECT concepto, total FROM transacciones WHERE id = ?',
            [transactionId]
        );
        
        if (transaction.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Transacción no encontrada'
            });
        }
        
        // Eliminar transacción
        await executeQuery('DELETE FROM transacciones WHERE id = ?', [transactionId]);
        
        console.log(`🗑️ ${user.nombre} eliminó transacción ${transactionId}: ${transaction[0].concepto}`);
        
        res.json({
            success: true,
            message: 'Transacción eliminada exitosamente',
            data: {
                id: transactionId,
                concepto: transaction[0].concepto
            }
        });
        
    } catch (error) {
        console.error('Error eliminando transacción:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// GET /api/balance - Balance general por empresa y período
router.get('/balance', async (req, res) => {
    try {
        const { empresa_id, fechaInicio, fechaFin } = req.query;
        
        let whereClause = 'WHERE 1=1';
        let params = [];
        
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
        
        // Total ingresos
        const totalIngresos = await executeQuery(`
            SELECT COALESCE(SUM(total), 0) as total
            FROM transacciones ${whereClause} AND tipo = 'I'
        `, params);
        
        // Total gastos
        const totalGastos = await executeQuery(`
            SELECT COALESCE(SUM(total), 0) as total
            FROM transacciones ${whereClause} AND tipo = 'G'
        `, params);
        
        const ingresos = totalIngresos[0]?.total || 0;
        const gastos = totalGastos[0]?.total || 0;
        const balance = ingresos - gastos;
        
        res.json({
            success: true,
            data: {
                total_ingresos: parseFloat(ingresos),
                total_gastos: parseFloat(gastos),
                balance: parseFloat(balance),
                margen_porcentaje: ingresos > 0 ? ((balance / ingresos) * 100).toFixed(2) : 0
            }
        });
        
    } catch (error) {
        console.error('Error al generar balance:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// ==================== RUTAS DE ALERTAS DE PAGOS (ROCKSTARSKULL) ====================

// GET /api/alertas-pagos - Obtener alertas de pagos próximos y vencidos
router.get('/alertas-pagos', async (req, res) => {
    try {
        console.log('📅 Calculando alertas de pagos...');
        
        // OBTENER ALUMNOS REALES DE LA BASE DE DATOS
        console.log('🔍 Verificando datos de alumnos...');

        // Verificar si hay alumnos activos primero
        const [countResult] = await executeQuery(`
            SELECT COUNT(*) as total 
            FROM alumnos 
            WHERE empresa_id = 1 AND estatus = 'Activo' AND nombre NOT LIKE '[ELIMINADO]%'
        `);

        console.log(`📊 Total alumnos activos: ${countResult.total}`);

        if (countResult.total === 0) {
            console.log('⚠️ No hay alumnos activos, generando alertas de ejemplo');
            // Simular algunas alertas si no hay datos reales
            const alertasEjemplo = {
                proximos_vencer: [
                    {
                        id: 1, nombre: 'Ejemplo - Juan Pérez', clase: 'Guitarra', 
                        dias_restantes: 3, fecha_proximo_pago: '2025-08-30'
                    }
                ],
                vencidos: []
            };
            
            return res.json({
                success: true,
                data: {
                    proximos_vencer: alertasEjemplo.proximos_vencer,
                    vencidos: alertasEjemplo.vencidos,
                    total_alertas: alertasEjemplo.proximos_vencer.length,
                    fecha_calculo: new Date().toISOString(),
                    mensaje: 'Datos de ejemplo - No hay alumnos reales'
                }
            });
        }

        // Obtener alumnos reales con lógica de fechas simplificada
        const alumnos = await executeQuery(`
            SELECT 
                id,
                nombre,
                clase,
                precio_mensual,
                fecha_inscripcion,
                fecha_ultimo_pago,
                estatus
            FROM alumnos 
            WHERE empresa_id = 1 AND estatus = 'Activo' AND nombre NOT LIKE '[ELIMINADO]%'
            ORDER BY nombre
        `);

        console.log(`📊 Procesando alertas para ${alumnos.length} alumnos activos`);
        
        // Definir variables necesarias
        const hoy = new Date();
        const alertas = {
            proximos_vencer: [],
            vencidos: []
        };

        alumnos.forEach(alumno => {
            const fechaInscripcion = new Date(alumno.fecha_inscripcion);
            
            // Usar fecha_ultimo_pago si existe, sino calcular basado en inscripción
            let fechaUltimoPago;
            if (alumno.fecha_ultimo_pago) {
                fechaUltimoPago = new Date(alumno.fecha_ultimo_pago);
            } else {
                // Simular que el último pago fue hace un mes aproximadamente
                fechaUltimoPago = new Date();
                fechaUltimoPago.setMonth(fechaUltimoPago.getMonth() - 1);
            }
            
            // Calcular fecha del próximo pago (un mes después del último)
            const proximoPago = new Date(fechaUltimoPago);
            proximoPago.setMonth(proximoPago.getMonth() + 1);
            
            const diasDiferencia = Math.ceil((proximoPago - hoy) / (1000 * 60 * 60 * 24));
            
            if (diasDiferencia < 0) {
                // Pago vencido
                alertas.vencidos.push({
                    ...alumno,
                    dias_vencido: Math.abs(diasDiferencia),
                    fecha_proximo_pago: proximoPago.toISOString().split('T')[0]
                });
            } else if (diasDiferencia <= 5) {
                // Pago próximo a vencer (5 días o menos)
                alertas.proximos_vencer.push({
                    ...alumno,
                    dias_restantes: diasDiferencia,
                    fecha_proximo_pago: proximoPago.toISOString().split('T')[0]
                });
            }
        });
        
        res.json({
            success: true,
            data: {
                proximos_vencer: alertas.proximos_vencer,
                vencidos: alertas.vencidos,
                total_alertas: alertas.proximos_vencer.length + alertas.vencidos.length,
                fecha_calculo: hoy.toISOString()
            }
        });
        
        } catch (error) {
        console.error('❌ ERROR DETALLADO en alertas-pagos:', error);
        console.error('📍 Stack trace:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor procesando alertas',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// POST /api/alertas-pagos/marcar-notificado/:alumno_id - Marcar alerta como notificada
router.post('/alertas-pagos/marcar-notificado/:alumno_id', async (req, res) => {
    try {
        const alumnoId = req.params.alumno_id;
        
        // Aquí registrarías en base de datos que se notificó al alumno
        // Por ahora solo simulamos
        
        res.json({
            success: true,
            message: `Alerta marcada como notificada para alumno ${alumnoId}`,
            data: {
                alumno_id: alumnoId,
                fecha_notificacion: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error marcando alerta:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// PUT /api/alumnos/:id/estatus - Cambiar estatus de alumno (Activo/Baja)
router.put('/alumnos/:id/estatus', async (req, res) => {
    try {
        const { id } = req.params;
        const { estatus } = req.body;
        
        if (!['Activo', 'Baja'].includes(estatus)) {
            return res.status(400).json({
                success: false,
                message: 'Estatus inválido. Debe ser "Activo" o "Baja"'
            });
        }
        
        await executeQuery(
            'UPDATE alumnos SET estatus = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [estatus, id]
        );
        
        res.json({
            success: true,
            message: `Alumno ${estatus === 'Activo' ? 'activado' : 'dado de baja'} exitosamente`
        });
        
    } catch (error) {
        console.error('Error cambiando estatus alumno:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// ==================== RUTAS DASHBOARD ====================
router.get('/dashboard/alumnos', transaccionesController.getDashboardAlumnos);
router.get('/alumnos', transaccionesController.getAlumnos);

// ✅ NUEVO: CRUD completo de alumnos
router.post('/alumnos', transaccionesController.createAlumno);
router.put('/alumnos/:id', transaccionesController.updateAlumno);
// 🗑️ NUEVO: Eliminar alumno (solo administradores)
router.delete('/alumnos/:id', transaccionesController.deleteAlumno);

export default router;