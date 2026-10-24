const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearApp } = require('../src/app');
const { crearServicio } = require('../src/services/conciertos.service');
const { registrarInscripcion } = require('../src/repositories/conciertos.repository');
const { ErrorAplicacion } = require('../src/services/error-aplicacion');

const entrada = {
  conciertoId: 1, nombre: ' Ana Pérez ', rut: '12.345.678-5', correo: ' ANA@EJEMPLO.CL '
};

test('valida y normaliza los datos antes de guardarlos', async () => {
  let guardado;
  const servicio = crearServicio({ registrarInscripcion: async (datos) => { guardado = datos; } });
  assert.equal((await servicio.inscribir(entrada)).ok, true);
  assert.deepEqual(guardado, {
    conciertoId: 1, nombre: 'Ana Pérez', rut: '12345678-5', correo: 'ana@ejemplo.cl'
  });
  for (const cambio of [
    { conciertoId: -1 }, { nombre: '' }, { rut: '12345678-9' }, { correo: 'invalido' }
  ]) {
    await assert.rejects(servicio.inscribir({ ...entrada, ...cambio }), { status: 400 });
  }
  await assert.rejects(servicio.inscribir(null), { status: 400 });
});

function baseSimulada({ existe = true, duplicada = false, cupos = 1, fecha = '2099-01-01T21:00:00-03:00' } = {}) {
  const escrituras = [];
  const transaccion = {
    async get(ref) {
      if (ref.coleccion === 'inscripciones') return { exists: duplicada };
      return {
        id: '1', exists: existe,
        data: () => ({ artista: 'Prueba', fecha, lugar: 'Santiago', cupoTotal: 1, cuposDisponibles: cupos })
      };
    },
    create: (ref, datos) => escrituras.push({ tipo: 'create', ref, datos }),
    update: (ref, datos) => escrituras.push({ tipo: 'update', ref, datos })
  };
  return {
    escrituras,
    collection: (coleccion) => ({ doc: (id) => ({ coleccion, id }) }),
    runTransaction: (operacion) => operacion(transaccion)
  };
}

test('crea la inscripción y descuenta el cupo en la misma transacción', async () => {
  const db = baseSimulada();
  await registrarInscripcion({ ...entrada, rut: '12345678-5' }, db);
  assert.deepEqual(db.escrituras.map(e => e.tipo), ['create', 'update']);
  assert.equal(db.escrituras[0].ref.coleccion, 'inscripciones');
  assert.deepEqual(db.escrituras[1].datos, { cuposDisponibles: 0 });
});

test('no escribe si falta el concierto, está agotado, finalizado o duplicado', async () => {
  for (const [opciones, status] of [
    [{ existe: false }, 404], [{ duplicada: true }, 409],
    [{ cupos: 0 }, 409], [{ fecha: '2000-01-01' }, 409]
  ]) {
    const db = baseSimulada(opciones);
    await assert.rejects(registrarInscripcion(entrada, db), { status });
    assert.equal(db.escrituras.length, 0);
  }
});

test('API y frontend comparten origen; errores mantienen el contrato JSON', async (t) => {
  let fallo = false;
  const servicio = crearServicio({
    async listarConciertos() {
      if (fallo) throw new Error('credencial privada que no debe salir en HTTP');
      return [{ id: 1, artista: 'Prueba' }];
    },
    async registrarInscripcion() { throw new ErrorAplicacion(409, 'No quedan cupos disponibles.'); }
  });
  const servidor = crearApp(servicio).listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  t.after(() => new Promise(resolve => servidor.close(resolve)));
  const url = `http://127.0.0.1:${servidor.address().port}`;
  const pagina = await fetch(url);
  assert.equal(pagina.status, 200);
  assert.match(await pagina.text(), /cartelera.js/);
  const lista = await fetch(`${url}/api/conciertos`);
  assert.deepEqual(await lista.json(), { ok: true, datos: [{ id: 1, artista: 'Prueba' }] });
  const agotado = await fetch(`${url}/api/inscripciones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entrada)
  });
  assert.equal(agotado.status, 409);
  const invalido = await fetch(`${url}/api/inscripciones`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
  });
  assert.equal(invalido.status, 400);
  assert.equal((await invalido.json()).ok, false);
  assert.equal((await fetch(`${url}/backend/.env`)).status, 404);
  assert.equal((await fetch(`${url}/api/no-existe`)).status, 404);
  fallo = true;
  const error = await fetch(`${url}/api/conciertos`);
  assert.equal(error.status, 503);
  assert.equal((await error.json()).mensaje.includes('credencial privada'), false);
});
