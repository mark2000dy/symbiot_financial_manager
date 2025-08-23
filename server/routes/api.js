// ====================================================
// RUTAS API - TRANSACCIONES, GASTOS E INGRESOS
// Archivo: server/routes/api.js
// ====================================================

import express from 'express';
import { transaccionesController } from '../controllers/transacciones.js';

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

// ==================== RUTAS DE REPORTES DASHBOARD ====================
// GET /api/dashboard - Datos para dashboard principal
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
        
        // Gastos por mes
        const gastosPorMes = await executeQuery(`
            SELECT 
                DATE_FORMAT(fecha, '%Y-%m') as mes,
                SUM(total) as total
            FROM transacciones 
            ${whereClause} AND tipo = 'G'
            GROUP BY DATE_FORMAT(fecha, '%Y-%m')
            ORDER BY mes
        `, params);
        
        // Ingresos por mes
        const ingresosPorMes = await executeQuery(`
            SELECT 
                DATE_FORMAT(fecha, '%Y-%m') as mes,
                SUM(total) as total
            FROM transacciones 
            ${whereClause} AND tipo = 'I'
            GROUP BY DATE_FORMAT(fecha, '%Y-%m')
            ORDER BY mes
        `, params);
        
        // Totales del mes actual
        const whereClauseMesActual = whereClause + ' AND MONTH(fecha) = MONTH(NOW()) AND YEAR(fecha) = YEAR(NOW())';
        
        const totalesMes = await executeQuery(`
            SELECT 
                tipo,
                COALESCE(SUM(total), 0) as total
            FROM transacciones ${whereClauseMesActual}
            GROUP BY tipo
        `, [...params, ...params]);
        
        // Top 5 conceptos de gastos
        const topGastos = await executeQuery(`
            SELECT 
                concepto,
                COUNT(*) as cantidad,
                SUM(total) as total
            FROM transacciones 
            ${whereClause} AND tipo = 'G'
            GROUP BY concepto
            ORDER BY total DESC
            LIMIT 5
        `, params);
        
        res.json({
            success: true,
            data: {
                gastos_por_mes: gastosPorMes,
                ingresos_por_mes: ingresosPorMes,
                totales_mes_actual: totalesMes,
                top_gastos: topGastos
            }
        });
        
    } catch (error) {
        console.error('Error al generar dashboard:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
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

// Importar executeQuery para las rutas de reportes
import { executeQuery } from '../config/database.js';

export default router;