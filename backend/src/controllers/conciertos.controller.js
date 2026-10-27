function crearControlador(servicio) {
  return {
    async listar(req, res) {
      res.json({ ok: true, datos: await servicio.listarConciertos() });
    },
    async inscribir(req, res) {
      res.status(201).json(await servicio.inscribir(req.body));
    },
    async misInscripciones(req, res) {
      res.json(await servicio.misInscripciones(req.body));
    },
    async crear(req, res) {
      res.status(201).json({ ok: true, datos: await servicio.crearConcierto(req.body) });
    },
    async actualizar(req, res) {
      res.json({ ok: true, datos: await servicio.actualizarConcierto(req.params.id, req.body) });
    },
    async eliminar(req, res) {
      res.json(await servicio.eliminarConcierto(req.params.id));
    }
  };
}

module.exports = { crearControlador };