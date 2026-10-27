function crearCors(origenesPermitidos) {
  const origenes = new Set(origenesPermitidos.split(',').map(o => o.trim()).filter(Boolean));
  return (req, res, next) => {
    const origen = req.get('Origin');
    res.vary('Origin');
    if (!origen) return next();
    const mismoOrigen = `${req.protocol}://${req.get('host')}`;
    if (origen !== mismoOrigen && !origenes.has(origen)) {
      return res.status(403).json({ ok: false, mensaje: 'Origen de la página no autorizado.' });
    }
    res.set('Access-Control-Allow-Origin', origen);
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  };
}

module.exports = { crearCors };
