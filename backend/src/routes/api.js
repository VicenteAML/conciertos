const { Router } = require('express');
const { crearControlador } = require('../controllers/conciertos.controller');

function crearRutas(servicio) {
  const rutas = Router();
  const controlador = crearControlador(servicio);
  rutas.get('/conciertos', controlador.listar);
  rutas.post('/inscripciones', controlador.inscribir);
  return rutas;
}

module.exports = { crearRutas };
