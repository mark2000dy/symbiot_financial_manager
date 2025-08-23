// ====================================================
// SERVIDOR PRINCIPAL - GASTOS SYMBIOT APP (ACTUALIZADO CON APIs)
// Archivo: server/app.js
// ====================================================

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { authController } from './controllers/auth.js';
import { testConnection } from './config/database.js';
import apiRoutes from './routes/api.js';

// Cargar variables de entorno
dotenv.config();

// Configuración ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE DE SEGURIDAD
// ============================================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

app.use(compression());

// ============================================================
// CONFIGURACIÓN DE SESIONES
// ============================================================
app.use(session({
    secret: process.env.JWT_SECRET || 'symbiot-gastos-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// ============================================================
// MIDDLEWARE DE PARSING
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// SERVIR ARCHIVOS ESTÁTICOS
// ============================================================
app.use('/gastos', express.static(path.join(__dirname, '../public')));

// ============================================================
// MIDDLEWARE DE AUTENTICACIÓN (PARA PÁGINAS)  
// ============================================================
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

// ============================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================
app.post('/gastos/api/login', authController.login);
app.post('/gastos/api/logout', authController.logout);
app.get('/gastos/api/user', requireAuth, authController.getCurrentUser);

// ============================================================
// RUTAS API DE TRANSACCIONES (PROTEGIDAS)
// ============================================================
app.use('/gastos/api', apiRoutes);

// ============================================================
// RUTAS PRINCIPALES
// ============================================================
app.get('/gastos', (req, res) => {
    if (req.session && req.session.user) {
        res.redirect('/gastos/dashboard.html');
    } else {
        res.redirect('/gastos/login.html');
    }
});

app.get('/gastos/', (req, res) => {
    res.redirect('/gastos');
});

// ============================================================
// HEALTH CHECK - SOLO UNA DEFINICIÓN
// ============================================================
app.get('/gastos/api/health', async (req, res) => {
    try {
        const dbStatus = await testConnection();
        
        // Test básico de tabla transacciones
        let tablesStatus = false;
        if (dbStatus) {
            try {
                const { executeQuery } = await import('./config/database.js');
                const result = await executeQuery('SELECT COUNT(*) as total FROM transacciones LIMIT 1');
                tablesStatus = true;
                console.log(`💾 Transacciones en BD: ${result[0].total}`);
            } catch (error) {
                console.log('⚠️ Tabla transacciones no accesible:', error.message);
            }
        }
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            services: {
                database: dbStatus ? 'connected' : 'disconnected',
                tables: tablesStatus ? 'ready' : 'not_ready'
            },
            endpoints: {
                login: '/gastos/api/login',
                gastos: '/gastos/api/gastos',
                ingresos: '/gastos/api/ingresos',
                transacciones: '/gastos/api/transacciones',
                resumen: '/gastos/api/transacciones/resumen',
                dashboard: '/gastos/api/dashboard'
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Health check failed',
            error: error.message
        });
    }
});

// ============================================================
// MANEJO DE ERRORES 404
// ============================================================
app.use((req, res) => {
    if (req.path.startsWith('/gastos/api/')) {
        res.status(404).json({
            success: false,
            error: 'Endpoint no encontrado',
            path: req.path
        });
    } else {
        res.status(404).redirect('/gastos/login.html');
    }
});

// ============================================================
// MANEJO DE ERRORES GENERAL
// ============================================================
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    
    if (req.path.startsWith('/gastos/api/')) {
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    } else {
        res.status(500).send('Error interno del servidor');
    }
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, () => {
    console.log('✅ Pool de conexiones MySQL creado');
    console.log('🚀 Servidor Gastos Symbiot ejecutándose en puerto', PORT);
    console.log('📊 Panel:', `http://localhost:${PORT}/gastos`);
    console.log('🔧 Health Check:', `http://localhost:${PORT}/gastos/api/health`);
    console.log('📁 Entorno:', process.env.NODE_ENV || 'development');
    
    // Test de conexión inicial
    testConnection().then(status => {
        if (status) {
            console.log('✅ Base de datos conectada correctamente');
        } else {
            console.log('❌ Error de conexión a base de datos');
            console.log('💡 Verifica que MySQL esté ejecutándose y las credenciales sean correctas');
        }
    });
});

// ============================================================
// MANEJO GRACEFUL SHUTDOWN
// ============================================================
process.on('SIGINT', () => {
    console.log('\n🔄 Cerrando servidor gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔄 Cerrando servidor gracefully...');
    process.exit(0);
});

export default app;