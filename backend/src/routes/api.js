const { Router } = require('express');
const { crearControlador } = require('../controllers/conciertos.controller');
const { crearControladorAuth } = require('../controllers/auth.controller');
const { crearRequiereAdmin } = require('../middlewares/requiere-admin');

function crearRutas(servicio, servicioAuth) {
  const rutas = Router();
  const controlador = crearControlador(servicio);
  const auth = crearControladorAuth(servicioAuth);

  // ----- Públicas -----
  rutas.get('/conciertos', controlador.listar);
  rutas.post('/inscripciones', controlador.inscribir);
  rutas.post('/mis-inscripciones', controlador.misInscripciones);
  rutas.post('/auth/login', auth.login);

  // ----- Administrador (requieren token) -----
  const admin = Router();
  admin.use(crearRequiereAdmin(servicioAuth));
  admin.get('/sesion', auth.sesion);
  admin.post('/conciertos', controlador.crear);
  admin.put('/conciertos/:id', controlador.actualizar);
  admin.delete('/conciertos/:id', controlador.eliminar);
  rutas.use('/admin', admin);

  return rutas;
}

module.exports = { crearRutas };