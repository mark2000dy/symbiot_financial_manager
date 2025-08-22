console.log("🧪 Test básico iniciando...");
console.log("Node.js version:", process.version);

try {
    const express = await import("express");
    console.log("✅ Express importado correctamente");
    
    const app = express.default();
    console.log("✅ Express app creada");
    
    console.log("🎉 Test exitoso - Todo funcionando");
} catch (error) {
    console.log("❌ Error:", error.message);
}
