const { ErrorAplicacion } = require('./error-aplicacion');

function rutValido(rut) {
  if (!/^\d{7,8}-[\dK]$/.test(rut)) return false;
  const [numero, digito] = rut.split('-');
  let suma = 0;
  let factor = 2;
  for (const caracter of [...numero].reverse()) {
    suma += Number(caracter) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return digito === esperado;
}

function crearServicio(repositorio) {
  return {
    listarConciertos: () => repositorio.listarConciertos(),
    async inscribir(entrada) {
      const { conciertoId, nombre, rut, correo } = entrada || {};
      if (!Number.isSafeInteger(conciertoId) || conciertoId <= 0) {
        throw new ErrorAplicacion(400, 'Selecciona un concierto válido.');
      }
      if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 120) {
        throw new ErrorAplicacion(400, 'Ingresa un nombre de entre 2 y 120 caracteres.');
      }
      const rutNormalizado = typeof rut === 'string'
        ? rut.trim().replace(/\./g, '').toUpperCase() : '';
      if (!rutValido(rutNormalizado)) {
        throw new ErrorAplicacion(400, 'Ingresa un RUT válido, incluyendo su dígito verificador.');
      }
      if (typeof correo !== 'string' || correo.trim().length > 254 || !/^\S+@\S+\.\S+$/.test(correo.trim())) {
        throw new ErrorAplicacion(400, 'Ingresa un correo válido.');
      }
      await repositorio.registrarInscripcion({
        conciertoId, nombre: nombre.trim(), rut: rutNormalizado,
        correo: correo.trim().toLowerCase()
      });
      return { ok: true, mensaje: '¡Inscripción exitosa!' };
    }
  };
}

module.exports = { crearServicio };
