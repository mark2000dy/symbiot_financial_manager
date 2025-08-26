// ====================================================
// SCRIPT BÁSICO DE POBLACIÓN DE DATOS
// Archivo: seed.js (en la raíz del proyecto)
// Poblar con datos simulados para desarrollo
// ====================================================

import { executeQuery } from './server/config/database.js';
import bcrypt from 'bcrypt';

console.log('🌱 SYMBIOT FINANCIAL MANAGER - SEED DATA BÁSICO');
console.log('================================================');

async function poblarDatosBasicos() {
    try {
        // 1. Limpiar datos existentes
        await limpiarDatos();
        
        // 2. Insertar datos básicos
        await insertarEmpresas();
        await insertarUsuarios();
        await insertarMaestros();
        await insertarStaff();
        await insertarAlumnosSimulados();
        await insertarTransaccionesSimuladas();
        
        console.log('\n🎉 ¡DATOS BÁSICOS POBLADOS EXITOSAMENTE!');
        console.log('📊 Dashboard disponible en: http://localhost:3000/gastos');
        
    } catch (error) {
        console.error('\n❌ Error poblando datos básicos:', error.message);
        throw error;
    }
}

// 🧹 Limpiar datos existentes
async function limpiarDatos() {
    console.log('\n🧹 Limpiando datos existentes...');
    
    const tables = ['transacciones', 'pagos_mensuales', 'alumnos', 'staff', 'maestros', 'usuarios', 'empresas'];
    
    for (const table of tables) {
        try {
            await executeQuery(`DELETE FROM ${table}`);
            console.log(`✅ Tabla ${table} limpiada`);
        } catch (error) {
            console.log(`⚠️ Advertencia limpiando ${table}: ${error.message}`);
        }
    }
}

// 🏢 Insertar empresas
async function insertarEmpresas() {
    console.log('\n🏢 Insertando empresas...');
    
    const empresas = [
        [1, 'Rockstar Skull', 'Academia de Música'],
        [2, 'Symbiot Technologies', 'Desarrollo IoT y Aplicaciones']
    ];
    
    for (const [id, nombre, tipo] of empresas) {
        await executeQuery(
            'INSERT INTO empresas (id, nombre, tipo_negocio) VALUES (?, ?, ?)',
            [id, nombre, tipo]
        );
        console.log(`✅ Empresa: ${nombre}`);
    }
}

// 👥 Insertar usuarios del sistema
async function insertarUsuarios() {
    console.log('\n👥 Insertando usuarios del sistema...');
    
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const usuarios = [
        [1, 'Marco Delgado', 'marco.delgado@symbiot.com.mx', passwordHash, 'admin', 'Symbiot Technologies'],
        [2, 'Antonio Razo', 'antonio.razo@symbiot.com.mx', passwordHash, 'admin', 'Symbiot Technologies'],
        [3, 'Hugo Vazquez', 'hugo.vazquez@rockstarskull.com', passwordHash, 'user', 'Rockstar Skull'],
        [4, 'Escuela', 'escuela@rockstarskull.com', passwordHash, 'user', 'Rockstar Skull']
    ];
    
    for (const [id, nombre, email, password, rol, empresa] of usuarios) {
        await executeQuery(
            'INSERT INTO usuarios (id, nombre, email, password_hash, rol, empresa) VALUES (?, ?, ?, ?, ?, ?)',
            [id, nombre, email, password, rol, empresa]
        );
        console.log(`✅ Usuario: ${nombre} (${rol})`);
    }
}

// 🎸 Insertar maestros
async function insertarMaestros() {
    console.log('\n🎸 Insertando maestros...');
    
    const maestros = [
        [1, 'Hugo Vazquez', 'hugo.vazquez@rockstarskull.com', null, 'Director y Guitarra Eléctrica', 1],
        [2, 'Julio', 'julio@rockstarskull.com', null, 'Batería', 1],
        [3, 'Demian', 'demian@rockstarskull.com', null, 'Batería', 1],
        [4, 'Irwin', 'irwin@rockstarskull.com', null, 'Guitarra Eléctrica', 1],
        [5, 'Nahomy', 'nahomy@rockstarskull.com', null, 'Canto', 1],
        [6, 'Luis', 'luis@rockstarskull.com', null, 'Bajo Eléctrico', 1],
        [7, 'Manuel', 'manuel@rockstarskull.com', null, 'Piano/Teclado', 1],
        [8, 'Harim López', 'harim.lopez@rockstarskull.com', null, 'Piano/Teclado', 1]
    ];
    
    for (const [id, nombre, email, telefono, especialidad, empresa_id] of maestros) {
        await executeQuery(
            'INSERT INTO maestros (id, nombre, email, telefono, especialidad, empresa_id) VALUES (?, ?, ?, ?, ?, ?)',
            [id, nombre, email, telefono, especialidad, empresa_id]
        );
        console.log(`✅ Maestro: ${nombre} - ${especialidad}`);
    }
}

// 👔 Insertar staff administrativo
async function insertarStaff() {
    console.log('\n👔 Insertando staff administrativo...');
    
    const staff = [
        [1, 'Marco Delgado', 'marco.delgado@symbiot.com.mx', null, 'Financial Manager', 2],
        [2, 'Antonio Razo', 'antonio.razo@symbiot.com.mx', null, 'Marketing Manager', 2],
        [3, 'Santiago Rosas', 'santiago.rosas@rockstarskull.com', null, 'Staff Leader', 1],
        [4, 'Emiliano Rosas', 'emiliano.rosas@rockstarskull.com', null, 'MKT Leader', 1],
        [5, 'Maria de la Luz Nava', 'maria.nava@rockstarskull.com', null, 'Cleaning Concierge', 1]
    ];
    
    for (const [id, nombre, email, telefono, puesto, empresa_id] of staff) {
        await executeQuery(
            'INSERT INTO staff (id, nombre, email, telefono, puesto, empresa_id) VALUES (?, ?, ?, ?, ?, ?)',
            [id, nombre, email, telefono, puesto, empresa_id]
        );
        console.log(`✅ Staff: ${nombre} - ${puesto}`);
    }
}

// 🎓 Insertar alumnos simulados para desarrollo
async function insertarAlumnosSimulados() {
    console.log('\n🎓 Insertando alumnos simulados...');
    
    const alumnos = [
        ['Juan Pérez López', 16, null, null, 'Guitarra', 'Grupal', 1, '18:00-19:00 Lu', '2024-01-15', null, 1500, 'Efectivo', false, 'Activo'],
        ['María García Ruiz', 22, null, null, 'Piano', 'Individual', 7, '16:00-17:00 Ma', '2024-02-10', null, 2000, 'Transferencia', false, 'Activo'],
        ['Carlos López Méndez', 19, null, null, 'Batería', 'Grupal', 2, '19:00-20:00 Mi', '2023-08-20', null, 1500, 'TPV', false, 'Baja'],
        ['Ana Martínez Silva', 17, null, null, 'Canto', 'Individual', 5, '17:00-18:00 Ju', '2024-03-05', null, 2000, 'Efectivo', false, 'Activo'],
        ['Luis Rivera Campos', 25, null, null, 'Bajo', 'Grupal', 6, '20:00-21:00 Vi', '2023-11-12', null, 1500, 'Transferencia', false, 'Baja'],
        ['Santiago Rosas', 28, null, null, 'Guitarra', 'Individual', 1, '15:00-16:00 Sa', '2023-07-01', 'Becado - Staff', 0, 'Efectivo', false, 'Activo']
    ];
    
    for (const alumno of alumnos) {
        const [nombre, edad, telefono, email, clase, tipo_clase, maestro_id, horario, fecha_inscripcion, promocion, precio_mensual, forma_pago, domiciliado, estatus] = alumno;
        
        await executeQuery(`
            INSERT INTO alumnos (nombre, edad, telefono, email, clase, tipo_clase, maestro_id, horario, 
                               fecha_inscripcion, promocion, precio_mensual, forma_pago, domiciliado, estatus, empresa_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [nombre, edad, telefono, email, clase, tipo_clase, maestro_id, horario, fecha_inscripcion, promocion, precio_mensual, forma_pago, domiciliado, estatus, 1]);
        
        console.log(`✅ Alumno: ${nombre} - ${clase} (${tipo_clase})`);
    }
}

// 💰 Insertar transacciones simuladas
async function insertarTransaccionesSimuladas() {
    console.log('\n💰 Insertando transacciones simuladas...');
    
    // Ingresos de Symbiot
    const ingresosSymbiot = [
        ['2024-01-15', 'Desarrollo Sistema IoT - Cliente ABC', 'Marco Delgado', 2, 'Transferencia', 1, 45000, 'I', 1],
        ['2024-02-10', 'App Móvil - Empresa XYZ', 'Marco Delgado', 2, 'Transferencia', 1, 32000, 'I', 1],
        ['2024-03-05', 'Consultoría Tecnológica', 'Marco Delgado', 2, 'Efectivo', 1, 8500, 'I', 1]
    ];
    
    for (const ingreso of ingresosSymbiot) {
        await executeQuery(`
            INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ingreso);
    }
    console.log(`✅ ${ingresosSymbiot.length} ingresos Symbiot insertados`);
    
    // Gastos de Symbiot
    const gastosSymbiot = [
        ['2024-01-20', 'Licencias de Software', 'Marco Delgado', 2, 'Transferencia', 3, 1200, 'G', 1],
        ['2024-02-15', 'Equipo de Cómputo', 'Antonio Razo', 2, 'Transferencia', 1, 15000, 'G', 2],
        ['2024-03-10', 'Hosting y Dominios', 'Marco Delgado', 2, 'TPV', 12, 450, 'G', 1]
    ];
    
    for (const gasto of gastosSymbiot) {
        await executeQuery(`
            INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, gasto);
    }
    console.log(`✅ ${gastosSymbiot.length} gastos Symbiot insertados`);
    
    // Ingresos de RockstarSkull (simulados)
    const ingresosAcademia = [
        ['2024-01-15', 'Pago mensualidad Guitarra - Juan Pérez López', 'Hugo Vazquez', 1, 'Efectivo', 1, 1500, 'I', 3],
        ['2024-02-10', 'Pago mensualidad Piano - María García Ruiz', 'Manuel', 1, 'Transferencia', 1, 2000, 'I', 3],
        ['2024-03-05', 'Pago mensualidad Canto - Ana Martínez Silva', 'Nahomy', 1, 'Efectivo', 1, 2000, 'I', 3]
    ];
    
    for (const ingreso of ingresosAcademia) {
        await executeQuery(`
            INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ingreso);
    }
    console.log(`✅ ${ingresosAcademia.length} ingresos RockstarSkull insertados`);
    
    // Gastos de RockstarSkull
    const gastosAcademia = [
        ['2024-01-10', 'Renta de Local', 'Hugo Vazquez', 1, 'Transferencia', 1, 8000, 'G', 3],
        ['2024-02-05', 'Instrumentos Musicales', 'Antonio Razo', 1, 'Efectivo', 2, 3500, 'G', 3],
        ['2024-03-01', 'Material Didáctico', 'Hugo Vazquez', 1, 'Efectivo', 1, 1200, 'G', 3]
    ];
    
    for (const gasto of gastosAcademia) {
        await executeQuery(`
            INSERT INTO transacciones (fecha, concepto, socio, empresa_id, forma_pago, cantidad, precio_unitario, tipo, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, gasto);
    }
    console.log(`✅ ${gastosAcademia.length} gastos RockstarSkull insertados`);
}

// Ejecutar población
poblarDatosBasicos()
    .then(() => {
        console.log('\n🎉 ¡Proceso completado exitosamente!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error en el proceso:', error.message);
        process.exit(1);
    });