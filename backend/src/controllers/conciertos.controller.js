function crearControlador(servicio) {
  return {
    async listar(req, res) {
      res.json({ ok: true, datos: await servicio.listarConciertos() });
    },
    async inscribir(req, res) {
      res.status(201).json(await servicio.inscribir(req.body));
    }
  };
}

module.exports = { crearControlador };
