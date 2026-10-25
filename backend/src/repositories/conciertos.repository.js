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

async function crearConcierto(datos, db = obtenerFirestore()) {
  const coleccion = db.collection('conciertos');
  return db.runTransaction(async (transaccion) => {
    // Los IDs son enteros: se toma el mayor existente + 1 dentro de la transacción.
    const existentes = await transaccion.get(coleccion.select());
    const maximo = existentes.docs.reduce((m, d) => Math.max(m, Number(d.id) || 0), 0);
    const id = maximo + 1;
    const nuevo = { ...datos, cuposDisponibles: datos.cupoTotal };
    transaccion.create(coleccion.doc(String(id)), nuevo);
    return { id, ...nuevo };
  });
}

async function actualizarConcierto(id, datos, db = obtenerFirestore()) {
  const ref = db.collection('conciertos').doc(String(id));
  return db.runTransaction(async (transaccion) => {
    const documento = await transaccion.get(ref);
    if (!documento.exists) throw new ErrorAplicacion(404, 'Concierto no encontrado.');
    const actual = convertirConcierto(documento);
    // Los inscritos se conservan: solo se recalculan los cupos libres.
    const inscritos = actual.cupoTotal - actual.cuposDisponibles;
    if (datos.cupoTotal < inscritos) {
      throw new ErrorAplicacion(409,
        `No puedes bajar el cupo total a ${datos.cupoTotal}: ya hay ${inscritos} inscritos.`);
    }
    const cambios = { ...datos, cuposDisponibles: datos.cupoTotal - inscritos };
    transaccion.update(ref, cambios);
    return { id, ...cambios };
  });
}

async function eliminarConcierto(id, db = obtenerFirestore()) {
  const ref = db.collection('conciertos').doc(String(id));
  await db.runTransaction(async (transaccion) => {
    const documento = await transaccion.get(ref);
    if (!documento.exists) throw new ErrorAplicacion(404, 'Concierto no encontrado.');
    const actual = convertirConcierto(documento);
    const inscritos = actual.cupoTotal - actual.cuposDisponibles;
    if (inscritos > 0) {
      throw new ErrorAplicacion(409,
        `No se puede eliminar: el concierto tiene ${inscritos} inscritos.`);
    }
    transaccion.delete(ref);
  });
}

module.exports = {
  listarConciertos, registrarInscripcion,
  crearConcierto, actualizarConcierto, eliminarConcierto
};