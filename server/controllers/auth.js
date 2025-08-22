// ====================================================
// CONTROLADOR DE AUTENTICACIÓN
// Archivo: server/controllers/auth.js
// ====================================================

import bcrypt from 'bcrypt';
import { executeQuery } from '../config/database.js';

export const authController = {
    // Login de usuario
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email y contraseña son requeridos'
                });
            }

            // Buscar usuario por email
            const users = await executeQuery(
                'SELECT * FROM usuarios WHERE email = ? AND activo = TRUE',
                [email]
            );
            
            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }

            const user = users[0];

            // Verificar contraseña
            let passwordValid = false;
            
            // Si el hash es temporal, usar contraseña por defecto
            if (user.password_hash === '$2b$10$TEMP_HASH_TO_UPDATE') {
                passwordValid = (password === 'admin123');
                
                // Actualizar con hash real
                if (passwordValid) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await executeQuery(
                        'UPDATE usuarios SET password_hash = ? WHERE id = ?',
                        [hashedPassword, user.id]
                    );
                }
            } else {
                passwordValid = await bcrypt.compare(password, user.password_hash);
            }

            if (!passwordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }

            // Crear sesión
            req.session.user = {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
                empresa: user.empresa
            };

            console.log(`✅ Login exitoso: ${user.email} (${user.rol})`);

            res.json({
                success: true,
                message: 'Login exitoso',
                user: {
                    id: user.id,
                    nombre: user.nombre,
                    email: user.email,
                    rol: user.rol,
                    empresa: user.empresa
                },
                redirectUrl: '/gastos/dashboard.html'
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    },

    // Logout de usuario
    logout: async (req, res) => {
        try {
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        error: 'Error al cerrar sesión'
                    });
                }

                res.json({
                    success: true,
                    message: 'Sesión cerrada exitosamente',
                    redirectUrl: '/gastos/login.html'
                });
            });

        } catch (error) {
            console.error('Error en logout:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    },

    // Obtener usuario actual
    getCurrentUser: async (req, res) => {
        try {
            if (!req.session || !req.session.user) {
                return res.status(401).json({
                    success: false,
                    error: 'No hay sesión activa'
                });
            }

            res.json({
                success: true,
                user: req.session.user
            });

        } catch (error) {
            console.error('Error obteniendo usuario actual:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    }
};

export default authController;
