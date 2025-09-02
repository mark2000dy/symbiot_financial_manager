// ====================================================
// SETUP AUTOMÁTICO DE BASE DE DATOS
// Archivo: setup-database.js
// Crear tablas automáticamente si no existen
// ====================================================

import { executeQuery } from './server/config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Configuración
const SCHEMA_FILE = 'database/schema.sql';

async function verificarYCrearTablas() {
    console.log('🔍 VERIFICANDO ESTRUCTURA DE BASE DE DATOS...\n');
    
    try {
        // 1. Verificar conexión
        console.log('1️⃣ Probando conexión a base de datos...');
        await executeQuery('SELECT 1 as test');
        console.log('✅ Conexión exitosa\n');
        
        // 2. Verificar si existen las tablas
        console.log('2️⃣ Verificando tablas existentes...');
        const tablas = await executeQuery('SHOW TABLES');
        const tablasExistentes = tablas.map(t => Object.values(t)[0]);
        
        console.log(`📋 Tablas encontradas: ${tablasExistentes.length}`);
        tablasExistentes.forEach(tabla => console.log(`   - ${tabla}`));
        
        // 3. Lista de tablas requeridas
        const tablasRequeridas = [
            'empresas', 'usuarios', 'maestros', 'staff', 
            'alumnos', 'clientes', 'transacciones'
        ];
        
        const tablasFaltantes = tablasRequeridas.filter(
            tabla => !tablasExistentes.includes(tabla)
        );
        
        console.log(`\n📊 Tablas requeridas: ${tablasRequeridas.length}`);
        console.log(`❌ Tablas faltantes: ${tablasFaltantes.length}`);
        
        if (tablasFaltantes.length > 0) {
            console.log('⚠️ Tablas faltantes:');
            tablasFaltantes.forEach(tabla => console.log(`   - ${tabla}`));
            
            // 4. Ejecutar schema.sql automáticamente
            console.log('\n🔨 CREANDO TABLAS AUTOMÁTICAMENTE...');
            await ejecutarSchema();
            
            // 5. Verificar creación exitosa
            console.log('\n✅ Verificando creación de tablas...');
            const tablasNuevas = await executeQuery('SHOW TABLES');
            const tablasCreadas = tablasNuevas.map(t => Object.values(t)[0]);
            
            console.log(`📋 Tablas después de la creación: ${tablasCreadas.length}`);
            tablasCreadas.forEach(tabla => console.log(`   ✅ ${tabla}`));
            
            if (tablasCreadas.length >= tablasRequeridas.length) {
                console.log('\n🎉 ¡TABLAS CREADAS EXITOSAMENTE!');
                return true;
            } else {
                throw new Error('No se pudieron crear todas las tablas requeridas');
            }
        } else {
            console.log('\n✅ ¡TODAS LAS TABLAS EXISTEN!');
            return true;
        }
        
    } catch (error) {
        console.error('\n❌ ERROR EN CONFIGURACIÓN:', error.message);
        console.log('\n🔧 SOLUCIÓN MANUAL:');
        console.log('1. mysql -u root -p');
        console.log('2. USE gastos_app_db;');
        console.log('3. SOURCE database/schema.sql;');
        return false;
    }
}

async function ejecutarSchema() {
    try {
        // Leer archivo schema.sql
        const schemaPath = path.join(process.cwd(), SCHEMA_FILE);
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Archivo schema no encontrado: ${SCHEMA_FILE}`);
        }
        
        console.log(`📁 Leyendo archivo: ${SCHEMA_FILE}`);
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        // Dividir en statements individuales
        const statements = schemaContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Ejecutando ${statements.length} statements SQL...`);
        
        let ejecutados = 0;
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await executeQuery(statement);
                    ejecutados++;
                    
                    // Mostrar progreso cada 5 statements
                    if (ejecutados % 5 === 0) {
                        console.log(`   Ejecutados: ${ejecutados}/${statements.length}`);
                    }
                } catch (error) {
                    // Ignorar errores de "IF NOT EXISTS" y duplicados
                    if (!error.message.includes('already exists') && 
                        !error.message.includes('Duplicate entry')) {
                        console.warn(`⚠️ Warning en statement: ${error.message}`);
                    }
                }
            }
        }
        
        console.log(`✅ Schema ejecutado: ${ejecutados} statements procesados`);
        
    } catch (error) {
        throw new Error(`Error ejecutando schema: ${error.message}`);
    }
}

async function mostrarEstadoFinal() {
    try {
        console.log('\n📊 ESTADO FINAL DE LA BASE DE DATOS:');
        
        const tablas = [
            { nombre: 'empresas', descripcion: 'Empresas del sistema' },
            { nombre: 'usuarios', descripcion: 'Usuarios del sistema' },
            { nombre: 'maestros', descripcion: 'Maestros de Rockstar Skull' },
            { nombre: 'staff', descripcion: 'Personal administrativo' },
            { nombre: 'alumnos', descripcion: 'Alumnos de la academia' },
            { nombre: 'clientes', descripcion: 'Clientes generales' },
            { nombre: 'transacciones', descripcion: 'Transacciones financieras' }
        ];
        
        for (const tabla of tablas) {
            try {
                const [count] = await executeQuery(`SELECT COUNT(*) as total FROM ${tabla.nombre}`);
                console.log(`   📋 ${tabla.nombre}: ${count.total} registros (${tabla.descripcion})`);
            } catch (error) {
                console.log(`   ❌ ${tabla.nombre}: Error accediendo`);
            }
        }
        
        console.log('\n🚀 LISTO PARA MIGRACIÓN:');
        console.log('   Ejecutar: node seed-test.js');
        console.log('   Si pasa: node seed-migration.js');
        
    } catch (error) {
        console.error('❌ Error mostrando estado final:', error.message);
    }
}

// ====================================================
// FUNCIÓN PRINCIPAL
// ====================================================

export async function configurarBaseDeDatos() {
    console.log('🚀 SETUP AUTOMÁTICO DE BASE DE DATOS\n');
    console.log('=' .repeat(50));
    
    const exito = await verificarYCrearTablas();
    
    if (exito) {
        await mostrarEstadoFinal();
        console.log('\n🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!');
        return true;
    } else {
        console.log('\n❌ CONFIGURACIÓN FALLÓ - Revisar errores arriba');
        return false;
    }
}

// ====================================================
// EJECUCIÓN DIRECTA
// ====================================================

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    configurarBaseDeDatos()
        .then((exito) => {
            process.exit(exito ? 0 : 1);
        })
        .catch((error) => {
            console.error('\n💥 ERROR CRÍTICO:', error);
            process.exit(1);
        });
}