-- ====================================================
-- SCHEMA PARA GASTOS APP - SYMBIOT TECHNOLOGIES
-- Base de datos: gastos_app_db
-- Usuario: gastos_user
-- Contraseña: Gastos2025!
-- ====================================================

-- Crear tabla de empresas
CREATE TABLE empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    tipo_negocio VARCHAR(100) NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Crear tabla de usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    empresa VARCHAR(50) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Crear tabla principal de transacciones
CREATE TABLE transacciones (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    concepto VARCHAR(500) NOT NULL,
    socio VARCHAR(50) NOT NULL,
    empresa_id INT NOT NULL,
    forma_pago VARCHAR(50) NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(15,2) NOT NULL CHECK (precio_unitario >= 0),
    total DECIMAL(17,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    tipo ENUM('G', 'I') NOT NULL COMMENT 'G=Gasto, I=Ingreso',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE RESTRICT,
    
    INDEX idx_fecha (fecha),
    INDEX idx_socio (socio),
    INDEX idx_empresa (empresa_id),
    INDEX idx_tipo (tipo)
);

-- Insertar datos iniciales de empresas
INSERT INTO empresas (nombre, tipo_negocio) VALUES 
('Rockstar Skull', 'Academia de Música'),
('Symbiot Technologies', 'Desarrollo IoT y Aplicaciones');

-- Insertar usuarios iniciales (password será hasheado: admin123)
INSERT INTO usuarios (nombre, email, password_hash, rol, empresa) VALUES 
('Marco Delgado', 'marco@symbiot.com', '$2b$10$TEMP_HASH_TO_UPDATE', 'admin', 'Symbiot Technologies'),
('Antonio Razo', 'antonio@rockstarskull.com', '$2b$10$TEMP_HASH_TO_UPDATE', 'admin', 'Rockstar Skull'),
('Hugo Vazquez', 'hugo@rockstarskull.com', '$2b$10$TEMP_HASH_TO_UPDATE', 'user', 'Rockstar Skull'),
('Escuela', 'escuela@rockstarskull.com', '$2b$10$TEMP_HASH_TO_UPDATE', 'user', 'Rockstar Skull');
