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

function validarId(id) {
  const numero = Number(id);
  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new ErrorAplicacion(400, 'El identificador del concierto no es válido.');
  }
  return numero;
}

function validarConcierto(entrada) {
  const { artista, fecha, lugar, cupoTotal } = entrada || {};
  if (typeof artista !== 'string' || artista.trim().length < 2 || artista.trim().length > 120) {
    throw new ErrorAplicacion(400, 'El artista debe tener entre 2 y 120 caracteres.');
  }
  if (typeof lugar !== 'string' || lugar.trim().length < 2 || lugar.trim().length > 160) {
    throw new ErrorAplicacion(400, 'El lugar debe tener entre 2 y 160 caracteres.');
  }
  const ms = typeof fecha === 'string' ? Date.parse(fecha) : NaN;
  if (!Number.isFinite(ms)) {
    throw new ErrorAplicacion(400, 'Ingresa una fecha y hora válidas.');
  }
  if (!Number.isSafeInteger(cupoTotal) || cupoTotal < 1 || cupoTotal > 100000) {
    throw new ErrorAplicacion(400, 'El cupo total debe ser un entero entre 1 y 100000.');
  }
  return {
    artista: artista.trim(), fecha: new Date(ms).toISOString(),
    lugar: lugar.trim(), cupoTotal
  };
}

function crearServicio(repositorio) {
  return {
    listarConciertos: () => repositorio.listarConciertos(),
    async crearConcierto(entrada) {
      return repositorio.crearConcierto(validarConcierto(entrada));
    },
    async actualizarConcierto(id, entrada) {
      return repositorio.actualizarConcierto(validarId(id), validarConcierto(entrada));
    },
    async eliminarConcierto(id) {
      await repositorio.eliminarConcierto(validarId(id));
      return { ok: true, mensaje: 'Concierto eliminado.' };
    },

    async misInscripciones(entrada) {
      const { rut, correo } = entrada || {};
      const rutNormalizado = typeof rut === 'string'
        ? rut.trim().replace(/\./g, '').toUpperCase() : '';
      if (!rutValido(rutNormalizado)) {
        throw new ErrorAplicacion(400, 'Ingresa un RUT válido, incluyendo su dígito verificador.');
      }
      if (typeof correo !== 'string' || correo.trim().length > 254 || !/^\S+@\S+\.\S+$/.test(correo.trim())) {
        throw new ErrorAplicacion(400, 'Ingresa un correo válido.');
      }
      const datos = await repositorio.buscarInscripciones({
        rut: rutNormalizado, correo: correo.trim().toLowerCase()
      });
      return { ok: true, datos };
    },

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