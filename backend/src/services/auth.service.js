const jwt = require('jsonwebtoken');
const { createHash, timingSafeEqual } = require('node:crypto');
const { obtenerConfigAuth } = require('../config/auth');
const { ErrorAplicacion } = require('./error-aplicacion');

function iguales(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function crearServicioAuth(leerConfig = obtenerConfigAuth) {
  function config() {
    const c = leerConfig();
    if (!c.secreto || c.secreto.length < 32 || !c.usuario || !c.password) {
      throw new ErrorAplicacion(500, 'El acceso de administrador no está configurado en el servidor.');
    }
    return c;
  }

  return {
    login(entrada) {
      const { usuario, password } = entrada || {};
      if (typeof usuario !== 'string' || typeof password !== 'string' || !usuario || !password) {
        throw new ErrorAplicacion(400, 'Ingresa usuario y contraseña.');
      }
      const c = config();
      // Se evalúan ambos para no revelar cuál de los dos falló.
      const usuarioOk = iguales(usuario, c.usuario);
      const passwordOk = iguales(password, c.password);
      if (!usuarioOk || !passwordOk) {
        throw new ErrorAplicacion(401, 'Usuario o contraseña incorrectos.');
      }
      const token = jwt.sign({ rol: 'admin', sub: c.usuario }, c.secreto, {
        algorithm: 'HS256', expiresIn: c.expira
      });
      return { ok: true, token };
    },

    verificar(token) {
      const c = config();
      try {
        const datos = jwt.verify(token, c.secreto, { algorithms: ['HS256'] });
        if (datos.rol !== 'admin') throw new Error('rol');
        return datos;
      } catch {
        throw new ErrorAplicacion(401, 'La sesión no es válida o expiró. Inicia sesión de nuevo.');
      }
    }
  };
}

module.exports = { crearServicioAuth };