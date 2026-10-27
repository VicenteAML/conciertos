const express = require('express');
const path = require('node:path');
const repositorio = require('./repositories/conciertos.repository');
const { crearServicio } = require('./services/conciertos.service');
const { crearRutas } = require('./routes/api');
const { crearServicioAuth } = require('./services/auth.service');
const { ErrorAplicacion } = require('./services/error-aplicacion');
const { crearCors } = require('./middlewares/cors');

function crearApp(servicio = crearServicio(repositorio), servicioAuth = crearServicioAuth(), opciones = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', crearCors(opciones.origenesPermitidos ?? process.env.CORS_ORIGINS ?? ''));
  app.use(express.json({ limit: '10kb' }));
  app.use('/api', crearRutas(servicio, servicioAuth));
  app.use('/api', (req, res) => {
    res.status(404).json({ ok: false, mensaje: 'Ruta no encontrada.' });
  });
  app.use(express.static(path.resolve(__dirname, '../../frontend/public')));
  app.use((error, req, res, next) => {
    if (error instanceof ErrorAplicacion) {
      return res.status(error.status).json({ ok: false, mensaje: error.message });
    }
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
      return res.status(error.status).json({ ok: false, mensaje: 'El cuerpo de la solicitud es inválido o demasiado grande.' });
    }
    console.error('Error del backend:', error.message);
    return res.status(503).json({
      ok: false, mensaje: 'No se pudo acceder a la base de datos. Intenta más tarde.'
    });
  });
  return app;
}

module.exports = { crearApp };
