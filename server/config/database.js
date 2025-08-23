// ====================================================
// CONFIGURACIÓN DE BASE DE DATOS MYSQL (CORREGIDA)
// Archivo: server/config/database.js
// ====================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de conexión a MySQL (Parámetros corregidos)
export const config = {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'gastos_app_db',
    user: process.env.DB_USERNAME || 'gastos_user',
    password: process.env.DB_PASSWORD || 'Gastos2025!',
    port: 3306,
    connectionLimit: 10,
    // Removemos parámetros deprecados que causaban warnings
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4'
};

// Pool de conexiones
let pool = null;

export const createPool = () => {
    if (!pool) {
        pool = mysql.createPool(config);
        console.log('✅ Pool de conexiones MySQL creado');
    }
    return pool;
};

export const getConnection = async () => {
    try {
        if (!pool) {
            pool = createPool();
        }
        const connection = await pool.getConnection();
        console.log('🔗 Conexión MySQL establecida');
        return connection;
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        throw error;
    }
};

export const executeQuery = async (query, params = []) => {
    let connection;
    try {
        connection = await getConnection();
        const [results] = await connection.execute(query, params);
        return results;
    } catch (error) {
        console.error('❌ Error ejecutando query:', error.message);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// Función para verificar conexión
export const testConnection = async () => {
    try {
        const connection = await getConnection();
        await connection.execute('SELECT 1 as test');
        connection.release();
        console.log('✅ Conexión a MySQL exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error en test de conexión MySQL:', error.message);
        return false;
    }
};

// Inicializar pool al cargar el módulo
createPool();

export default {
    getConnection,
    executeQuery,
    testConnection,
    config
};