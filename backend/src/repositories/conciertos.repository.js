const { createHash } = require('node:crypto');
const { FieldValue } = require('firebase-admin/firestore');
const { obtenerFirestore } = require('../config/firestore');
const { ErrorAplicacion } = require('../services/error-aplicacion');

function convertirConcierto(documento) {
  const datos = documento.data();
  return {
    id: Number(documento.id),
    artista: datos.artista,
    fecha: typeof datos.fecha?.toDate === 'function'
      ? datos.fecha.toDate().toISOString() : datos.fecha,
    lugar: datos.lugar,
    cupoTotal: datos.cupoTotal,
    cuposDisponibles: datos.cuposDisponibles
  };
}

async function listarConciertos() {
  const resultado = await obtenerFirestore().collection('conciertos').get();
  return resultado.docs.map(convertirConcierto);
}

async function registrarInscripcion(datos, db = obtenerFirestore()) {
  const conciertoRef = db.collection('conciertos').doc(String(datos.conciertoId));
  // Un mismo concierto y RUT siempre apuntan al mismo documento.
  const identificador = createHash('sha256')
    .update(`${datos.conciertoId}:${datos.rut}`).digest('hex');
  const inscripcionRef = db.collection('inscripciones').doc(identificador);

  await db.runTransaction(async (transaccion) => {
    const conciertoDoc = await transaccion.get(conciertoRef);
    const inscripcionDoc = await transaccion.get(inscripcionRef);
    if (!conciertoDoc.exists) {
      throw new ErrorAplicacion(404, 'Concierto no encontrado.');
    }
    if (inscripcionDoc.exists) {
      throw new ErrorAplicacion(409, 'Este RUT ya está inscrito en el concierto.');
    }

    const concierto = convertirConcierto(conciertoDoc);
    const fecha = new Date(concierto.fecha).getTime();
    if (!Number.isFinite(fecha)) {
      throw new Error('El concierto tiene una fecha inválida.');
    }
    if (fecha <= Date.now()) {
      throw new ErrorAplicacion(409, 'El concierto ya finalizó.');
    }
    if (!Number.isInteger(concierto.cuposDisponibles) || concierto.cuposDisponibles < 0) {
      throw new Error('El concierto tiene cupos inválidos.');
    }
    if (concierto.cuposDisponibles === 0) {
      throw new ErrorAplicacion(409, 'No quedan cupos disponibles.');
    }

    transaccion.create(inscripcionRef, {
      ...datos,
      creadaEn: FieldValue.serverTimestamp()
    });
    transaccion.update(conciertoRef, {
      cuposDisponibles: concierto.cuposDisponibles - 1
    });
  });
}

module.exports = { listarConciertos, registrarInscripcion };
