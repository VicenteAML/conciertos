const { ErrorAplicacion } = require('../services/error-aplicacion');

// Protege rutas: exige el encabezado "Authorization: Bearer <token>" de un admin.
function crearRequiereAdmin(servicioAuth) {
  return (req, res, next) => {
    const [tipo, token] = (req.get('authorization') || '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      return next(new ErrorAplicacion(401, 'Debes iniciar sesión como administrador.'));
    }
    try {
      req.admin = servicioAuth.verificar(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { crearRequiereAdmin };