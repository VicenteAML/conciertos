const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { crearApp } = require('../src/app');

test('frontend usa la IP del visitante y conserva las rutas desde subcarpetas', () => {
  const directorio = path.resolve(__dirname, '../../frontend/public/js');
  for (const origin of ['http://68.211.89.17', 'http://localhost:3000', 'http://localhost:8080']) {
    const contexto = vm.createContext({ URL, window: { location: { origin } } });
    vm.runInContext(fs.readFileSync(path.join(directorio, 'config.js'), 'utf8'), contexto);
    vm.runInContext(fs.readFileSync(path.join(directorio, 'comun.js'), 'utf8'), contexto);
    const destino = new URL(origin);
    destino.port = '3000';
    assert.equal(vm.runInContext('urlApi("/api/inscripciones")', contexto), `${destino.origin}/api/inscripciones`);
    contexto.window.CONFIG_CONCIERTOS.apiBaseUrl = 'https://api.ejemplo.cl';
    assert.equal(vm.runInContext('urlApi("/api/auth/login")', contexto), 'https://api.ejemplo.cl/api/auth/login');
  }
});

test('IIS puede consultar y enviar JSON y Authorization; otros orígenes se rechazan', async (t) => {
  let inscripciones = 0;
  const servicio = {
    listarConciertos: async () => [{ id: 1001 }],
    inscribir: async () => { inscripciones++; return { ok: true }; }
  };
  const auth = { verificar: () => ({ rol: 'admin' }) };
  const servidor = crearApp(servicio, auth, { origenesPermitidos: 'http://68.211.89.17' }).listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  t.after(() => new Promise(resolve => servidor.close(resolve)));
  const base = `http://127.0.0.1:${servidor.address().port}/api`;
  const origin = 'http://68.211.89.17';
  const consulta = await fetch(`${base}/conciertos`, { headers: { Origin: origin } });
  assert.equal(consulta.headers.get('access-control-allow-origin'), origin);
  assert.equal((await consulta.json()).datos[0].id, 1001);
  const preflight = await fetch(`${base}/admin/conciertos/1001`, {
    method: 'OPTIONS', headers: {
      Origin: origin, 'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'authorization,content-type'
    }
  });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-methods'), /PUT/);
  assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);
  const registro = await fetch(`${base}/inscripciones`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}'
  });
  assert.equal(registro.status, 201);
  assert.equal(registro.headers.get('access-control-allow-origin'), origin);
  const rechazado = await fetch(`${base}/inscripciones`, {
    method: 'POST', headers: { Origin: 'http://otro-sitio.example', 'Content-Type': 'application/json' }, body: '{}'
  });
  assert.equal(rechazado.status, 403);
  assert.equal(rechazado.headers.get('access-control-allow-origin'), null);
  assert.equal(inscripciones, 1);
});
