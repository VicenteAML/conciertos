const { obtenerFirestore } = require('../src/config/firestore');

async function comprobar() {
  let db;
  try {
    db = obtenerFirestore();
    const resultado = await db.collection('conciertos').limit(1).get();
    console.log('Conexión con Firestore verificada.');
    if (resultado.empty) console.log('La colección conciertos todavía no contiene documentos.');
  } catch (error) {
    console.error('No se pudo verificar Firestore:', error.message);
    console.error('Revisa backend/.env, las credenciales, los permisos y que la base (default) esté creada.');
    process.exitCode = 1;
  } finally {
    if (db) await db.terminate().catch(() => {});
  }
}

comprobar();
