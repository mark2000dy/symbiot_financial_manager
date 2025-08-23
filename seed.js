// ====================================================
// SCRIPT SIMPLE DE POBLACIÓN DE DATOS
// Archivo: seed.js (en la raíz del proyecto)
// ====================================================

import { poblarBaseDeDatos } from './database/seed-from-excel.js';

console.log('🌱 SYMBIOT FINANCIAL MANAGER - SEED DATA');
console.log('==========================================');

poblarBaseDeDatos()
    .then(() => {
        console.log('\n🎉 ¡Datos poblados exitosamente!');
        console.log('📊 Dashboard disponible en: http://localhost:3000/gastos');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error poblando datos:', error.message);
        process.exit(1);
    });