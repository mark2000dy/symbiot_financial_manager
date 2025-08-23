-- ====================================================
-- CONFIGURACIÓN INICIAL DE BASE DE DATOS
-- Archivo: database/setup.sql
-- EJECUTAR COMO ROOT EN MYSQL
-- ====================================================

-- 1. Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS gastos_app_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 2. Crear usuario si no existe (MySQL 8.0+)
CREATE USER IF NOT EXISTS 'gastos_user'@'localhost' IDENTIFIED BY 'Gastos2025!';

-- Para versiones anteriores de MySQL, usar:
-- CREATE USER 'gastos_user'@'localhost' IDENTIFIED BY 'Gastos2025!';

-- 3. Otorgar permisos completos al usuario en la base de datos
GRANT ALL PRIVILEGES ON gastos_app_db.* TO 'gastos_user'@'localhost';

-- 4. Aplicar cambios
FLUSH PRIVILEGES;

-- 5. Verificar que el usuario fue creado
SELECT User, Host FROM mysql.user WHERE User = 'gastos_user';

-- 6. Mostrar bases de datos disponibles
SHOW DATABASES;

-- ====================================================
-- INSTRUCCIONES DE USO:
-- 
-- 1. Abrir MySQL como root:
--    mysql -u root -p
--
-- 2. Ejecutar este archivo:
--    SOURCE C:/ruta/al/proyecto/database/setup.sql;
--    (o copiar y pegar el contenido)
--
-- 3. Verificar conexión:
--    npm run test
-- ====================================================