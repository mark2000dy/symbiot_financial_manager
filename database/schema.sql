-- ====================================================
-- SCHEMA PARA GASTOS APP - SYMBIOT TECHNOLOGIES
-- Base de datos: gastos_app_db
-- Usuario: gastos_user
-- Contraseña: Gastos2025!
-- ====================================================

-- ============================================================
-- 1. TABLA DE EMPRESAS
-- ============================================================
CREATE TABLE empresas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    tipo_negocio VARCHAR(100) NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. TABLA DE USUARIOS (Sistema)
-- ============================================================
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

-- ============================================================
-- 3. TABLA DE MAESTROS (Academia RockstarSkull)
-- ============================================================
CREATE TABLE maestros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    especialidad VARCHAR(100),
    empresa_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT,
    INDEX idx_maestros_empresa (empresa_id)
);

-- ============================================================
-- 4. TABLA DE STAFF (Personal administrativo)
-- ============================================================
CREATE TABLE staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    puesto VARCHAR(100) NOT NULL,
    empresa_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT,
    INDEX idx_staff_empresa (empresa_id)
);

-- ============================================================
-- 5. TABLA DE ALUMNOS (RockstarSkull)
-- ============================================================
CREATE TABLE alumnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    edad INT,
    telefono VARCHAR(20),
    email VARCHAR(100),
    
    -- INFORMACIÓN ACADÉMICA
    clase VARCHAR(50) NOT NULL COMMENT 'Guitarra, Piano, Batería, Bajo, Canto',
    tipo_clase ENUM('Individual', 'Grupal', 'Intensivo') DEFAULT 'Grupal',
    maestro_id INT,
    horario VARCHAR(100),
    
    -- INFORMACIÓN ADMINISTRATIVA  
    fecha_inscripcion DATE NOT NULL,
    promocion VARCHAR(100),
    precio_mensual DECIMAL(8,2) NOT NULL,
    forma_pago VARCHAR(50),
    domiciliado BOOLEAN DEFAULT FALSE,
    estatus ENUM('Activo', 'Baja') DEFAULT 'Activo',
    fecha_ultimo_pago DATE,
    
    -- METADATA
    empresa_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (maestro_id) REFERENCES maestros(id) ON DELETE SET NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT,
    
    INDEX idx_alumnos_estatus (estatus),
    INDEX idx_alumnos_empresa (empresa_id),
    INDEX idx_alumnos_maestro (maestro_id),
    INDEX idx_alumnos_clase (clase)
);

-- ============================================================
-- 6. TABLA DE PAGOS MENSUALES (Histórico julio 2023 - julio 2025)
-- ============================================================
CREATE TABLE pagos_mensuales (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    año INT NOT NULL,
    mes INT NOT NULL COMMENT '1=Enero, 2=Febrero, ..., 12=Diciembre',
    monto_pagado DECIMAL(8,2) NOT NULL DEFAULT 0,
    fecha_pago DATE,
    metodo_pago VARCHAR(50),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_alumno_mes (alumno_id, año, mes),
    INDEX idx_pagos_fecha (año, mes),
    INDEX idx_pagos_alumno (alumno_id)
);

-- ============================================================
-- 7. TABLA DE TRANSACCIONES (Gastos e Ingresos generales)
-- ============================================================
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
    
    INDEX idx_transacciones_fecha (fecha),
    INDEX idx_transacciones_socio (socio),
    INDEX idx_transacciones_empresa (empresa_id),
    INDEX idx_transacciones_tipo (tipo),
    INDEX idx_transacciones_created_by (created_by)
);

-- ============================================================
-- 8. DATOS INICIALES - EMPRESAS
-- ============================================================
INSERT INTO empresas (nombre, tipo_negocio) VALUES 
('Rockstar Skull', 'Academia de Música'),
('Symbiot Technologies', 'Desarrollo IoT y Aplicaciones');

-- ============================================================
-- 9. DATOS INICIALES - USUARIOS DEL SISTEMA
-- ============================================================
INSERT INTO usuarios (nombre, email, password_hash, rol, empresa) VALUES 
('Marco Delgado', 'marco.delgado@symbiot.com.mx', '$2b$10$TEMP_HASH_TO_UPDATE', 'admin', 'Symbiot Technologies'),
('Antonio Razo', 'antonio.razo@symbiot.com.mx', '$2b$10$TEMP_HASH_TO_UPDATE', 'admin', 'Symbiot Technologies'),
('Hugo Vazquez', 'hugo.vazquez@rockstarskull.com', '$2b$10$TEMP_HASH_TO_UPDATE', 'user', 'Rockstar Skull'),
('Escuela', 'escuela@rockstarskull.com', '$2b$10$TEMP_HASH_TO_UPDATE', 'user', 'Rockstar Skull');

-- ============================================================
-- 10. DATOS INICIALES - MAESTROS DE ROCKSTAR SKULL
-- ============================================================
INSERT INTO maestros (nombre, email, telefono, especialidad, empresa_id) VALUES 
('Hugo Vazquez', 'hugo.vazquez@rockstarskull.com', NULL, 'Director y Guitarra Eléctrica', 1),
('Julio', 'julio@rockstarskull.com', NULL, 'Batería', 1),
('Demian', 'demian@rockstarskull.com', NULL, 'Batería', 1), 
('Irwin', 'irwin@rockstarskull.com', NULL, 'Guitarra Eléctrica', 1),
('Nahomy', 'nahomy@rockstarskull.com', NULL, 'Canto', 1),
('Luis', 'luis@rockstarskull.com', NULL, 'Bajo Eléctrico', 1),
('Manuel', 'manuel@rockstarskull.com', NULL, 'Piano/Teclado', 1),
('Harim López', 'harim.lopez@rockstarskull.com', NULL, 'Piano/Teclado', 1);

-- ============================================================
-- 11. DATOS INICIALES - STAFF ADMINISTRATIVO
-- ============================================================
INSERT INTO staff (nombre, email, telefono, puesto, empresa_id) VALUES 
-- SYMBIOT TECHNOLOGIES
('Marco Delgado', 'marco.delgado@symbiot.com.mx', NULL, 'Financial Manager', 2),
('Antonio Razo', 'antonio.razo@symbiot.com.mx', NULL, 'Marketing Manager', 2),

-- ROCKSTAR SKULL  
('Santiago Rosas', 'santiago.rosas@rockstarskull.com', NULL, 'Staff Leader', 1),
('Emiliano Rosas', 'emiliano.rosas@rockstarskull.com', NULL, 'MKT Leader', 1),
('Maria de la Luz Nava', 'maria.nava@rockstarskull.com', NULL, 'Cleaning Concierge', 1);