const path = require('node:path');
const { existsSync } = require('node:fs');
const dotenv = require('dotenv');
const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// Las rutas relativas de credenciales se interpretan desde backend/.
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
    __dirname, '../..', process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}

let db;
function obtenerFirestore() {
  if (db) return db;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || projectId === 'tu-id-de-proyecto') {
    throw new Error('Configura FIREBASE_PROJECT_ID en backend/.env.');
  }

  const opciones = { projectId };
  // El emulador no necesita credenciales de producción.
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      throw new Error('No se encontró el archivo de credenciales indicado en backend/.env.');
    }
    opciones.credential = applicationDefault();
  }
  const app = getApps()[0] || initializeApp(opciones);
  db = getFirestore(app);
  return db;
}

module.exports = { obtenerFirestore };
