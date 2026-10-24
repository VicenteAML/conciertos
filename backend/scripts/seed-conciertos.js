const { obtenerFirestore } = require('../src/config/firestore');

// Datos ficticios para probar la interfaz; no representan eventos anunciados.
const conciertos = [
  { id: 1001, artista: 'Los Bunkers (ejemplo)', fecha: '2026-11-14T21:00:00-03:00', lugar: 'Escenario de prueba, Santiago', cupoTotal: 120, cuposDisponibles: 35 },
  { id: 1002, artista: 'Mon Laferte (ejemplo)', fecha: '2026-11-21T20:30:00-03:00', lugar: 'Teatro de prueba, Valparaíso', cupoTotal: 80, cuposDisponibles: 0 },
  { id: 1003, artista: 'Javiera Mena (ejemplo)', fecha: '2026-12-05T22:00:00-03:00', lugar: 'Sala de prueba, Concepción', cupoTotal: 60, cuposDisponibles: 12 },
  { id: 1004, artista: 'Noche de rock (ejemplo)', fecha: '2026-12-12T21:00:00-03:00', lugar: 'Parque de prueba, Viña del Mar', cupoTotal: 200, cuposDisponibles: 150 },
  { id: 1005, artista: 'Festival indie (ejemplo)', fecha: '2027-01-09T19:00:00-03:00', lugar: 'Anfiteatro de prueba, La Serena', cupoTotal: 90, cuposDisponibles: 3 },
  { id: 1006, artista: 'Sesión acústica (ejemplo)', fecha: '2027-01-23T20:00:00-03:00', lugar: 'Centro cultural de prueba, Temuco', cupoTotal: 40, cuposDisponibles: 40 }
];

async function cargar() {
  let db;
  try {
    db = obtenerFirestore();
    const referencias = conciertos.map(c => db.collection('conciertos').doc(String(c.id)));
    const creados = await db.runTransaction(async transaccion => {
      const documentos = await transaccion.getAll(...referencias);
      const nuevos = [];
      documentos.forEach((documento, indice) => {
        if (documento.exists) return;
        const { id, ...datos } = conciertos[indice];
        transaccion.create(referencias[indice], datos);
        nuevos.push(id);
      });
      return nuevos;
    });

    // Confirma mediante lectura que los documentos están en Firestore.
    const guardados = await db.getAll(...referencias);
    if (guardados.some(documento => !documento.exists)) {
      throw new Error('No se pudieron verificar todos los conciertos.');
    }
    console.log(`Proyecto: ${db.projectId}`);
    console.log(`Conciertos creados: ${creados.length}. Existentes conservados: ${conciertos.length - creados.length}.`);
    for (const documento of guardados) {
      const datos = documento.data();
      console.log(`${documento.id}: ${datos.artista} — ${datos.cuposDisponibles}/${datos.cupoTotal} cupos`);
    }
  } catch (error) {
    console.error('No se pudieron cargar los conciertos:', error.message);
    process.exitCode = 1;
  } finally {
    if (db) await db.terminate().catch(() => {});
  }
}

cargar();
