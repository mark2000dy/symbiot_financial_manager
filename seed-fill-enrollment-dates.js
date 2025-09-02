// seed-fill-enrollment-dates.js
// Ejecutar: node seed-fill-enrollment-dates.js
// Requiere: Node >=14, usa import/export porque tu proyecto usa ESM

import { executeQuery } from './server/config/database.js'; // Mismo import que seed-migration.js
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const EXCEL_FILE = 'base_transacciones.xlsx';
const SHEET_NAME = 'Alumnos'; // Cambia si la hoja tiene otro nombre

function fechaDesdeExcelValor(valor) {
  // Si es número (serial Excel) convertir
  if (typeof valor === 'number') {
    const fechaExcel = new Date((valor - 25569) * 86400 * 1000);
    return fechaExcel.toISOString().split('T')[0];
  }
  // Si ya es Date
  if (valor instanceof Date) {
    return valor.toISOString().split('T')[0];
  }
  // Si es string
  if (typeof valor === 'string' && valor.trim() !== '') {
    const posible = new Date(valor);
    if (!isNaN(posible.getTime())) {
      return posible.toISOString().split('T')[0];
    }
  }
  // Valor inválido o vacío → devolvemos null
  return null;
}

async function main() {
  try {
    const excelPath = path.join(process.cwd(), EXCEL_FILE);
    if (!fs.existsSync(excelPath)) {
      console.error(`Archivo Excel no encontrado: ${EXCEL_FILE}`);
      process.exit(1);
    }

    const workbook = XLSX.readFile(excelPath, { cellDates: true });
    const worksheet = workbook.Sheets[SHEET_NAME];
    if (!worksheet) {
      console.error(`Hoja "${SHEET_NAME}" no encontrada en ${EXCEL_FILE}`);
      process.exit(1);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    console.log(`📊 Encontradas ${rows.length} filas en hoja "${SHEET_NAME}"`);

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const row of rows) {
      // Ajustar nombres de columna según tu Excel
      const nombreRaw = row['Alumno'] || row['Nombre'] || row['ALUMNO'] || row['Nombre alumno'];
      const idRaw = row['ID'] || row['Id'] || row['AlumnoID'] || row['alumno_id'];
      const fechaRaw = row['Fecha de inscripción'] || row['Fecha inscripcion'] || row['fecha_inscripcion'];

      const nombre = nombreRaw ? String(nombreRaw).trim() : null;
      const fechaISO = fechaDesdeExcelValor(fechaRaw);

      if (!fechaISO) {
        skipped++;
        continue;
      }

      if (idRaw) {
        const id = Number(idRaw);
        if (!isNaN(id)) {
          const res = await executeQuery(
            `UPDATE alumnos 
             SET fecha_inscripcion = ? 
             WHERE id = ? 
             AND (fecha_inscripcion IS NULL OR fecha_inscripcion = '2025-09-01')`,
            [fechaISO, id]
          );
          if (res.affectedRows && res.affectedRows > 0) {
            updated++;
            console.log(`✅ Actualizado (id): alumno_id=${id} -> ${fechaISO}`);
            continue;
          } else {
            notFound++;
            console.warn(`⚠️ No se actualizó por id: id=${id}`);
            continue;
          }
        }
      }

      // Intentar coincidencia por nombre
      if (nombre) {
        const likeParam = `%${nombre}%`;
        const res = await executeQuery(
          `UPDATE alumnos 
           SET fecha_inscripcion = ? 
           WHERE (LOWER(TRIM(nombre)) = LOWER(TRIM(?)) OR nombre LIKE ?) 
             AND (fecha_inscripcion IS NULL OR fecha_inscripcion = '2025-09-01')`,
          [fechaISO, nombre, likeParam]
        );
        if (res.affectedRows && res.affectedRows > 0) {
          updated++;
          console.log(`✅ Actualizado (nombre match): "${nombre}" -> ${fechaISO}`);
          continue;
        } else {
          notFound++;
          console.warn(`⚠️ No se encontró coincidencia para nombre: "${nombre}"`);
          continue;
        }
      } else {
        skipped++;
      }
    }

    console.log(`\n🔍 Resumen final: actualizados=${updated} | sin fecha=${skipped} | no encontrados=${notFound}`);
    console.log('✅ Script finalizado');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en seed-fill-enrollment-dates:', error);
    process.exit(2);
  }
}

main();
