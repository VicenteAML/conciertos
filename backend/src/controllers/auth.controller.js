function crearControladorAuth(servicioAuth) {
  return {
    login(req, res) {
      res.json(servicioAuth.login(req.body));
    },
    // Sirve para que el frontend compruebe si el token guardado sigue vigente.
    sesion(req, res) {
      res.json({ ok: true, usuario: req.admin.sub });
    }
  };
}

module.exports = { crearControladorAuth };