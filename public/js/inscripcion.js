// ===== Página Inscripción (parte visual + validaciones en la página) =====
const idConcierto = Number(new URLSearchParams(location.search).get("id")); // viene de inscripcion.html?id=1
const detalle = document.getElementById("detalle-concierto");
const formulario = document.getElementById("form-inscripcion");
const mensaje = document.getElementById("mensaje");

// 1. Muestra los datos del concierto elegido
async function cargarConcierto() {
  const { conciertos } = await obtenerConciertos();
  const c = conciertos.find(x => x.id === idConcierto);

  if (!c) {
    detalle.innerHTML = "<p>Concierto no encontrado. Vuelve a la cartelera.</p>";
    formulario.hidden = true;
    return;
  }

  detalle.innerHTML = `
    <h2>${c.artista}</h2>
    <p>📅 ${formatearFecha(c.fecha)}</p>
    <p>📍 ${c.lugar}</p>
    <p class="cupos">Cupos disponibles: <strong>${c.cuposDisponibles}</strong></p>`;
}

// 2. Al enviar: valida en la página y luego manda los datos al servidor
formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault(); // evita que la página se recargue

  const nombre = formulario.nombre.value.trim();
  const rut = formulario.rut.value.trim();
  const correo = formulario.correo.value.trim();

  // Validaciones simples (las de cupos y duplicados las hace el backend)
  if (!nombre || !rut || !correo) {
    return mostrarMensaje(mensaje, "Completa todos los campos.", "error");
  }
  if (!/^\d{7,8}-[\dkK]$/.test(rut)) {
    return mostrarMensaje(mensaje, "Ingresa el RUT sin puntos y con guion (ej: 12345678-9).", "error");
  }
  if (!/^\S+@\S+\.\S+$/.test(correo)) {
    return mostrarMensaje(mensaje, "Ingresa un correo válido.", "error");
  }

  const boton = formulario.querySelector("button");
  boton.disabled = true;

  try {
    // Aquí termina mi parte: se envía al backend (POST /api/inscripciones)
    const respuesta = await fetch("/api/inscripciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conciertoId: idConcierto, nombre, rut, correo })
    });
    const json = await respuesta.json();

    // El backend decide el mensaje ("¡Inscripción exitosa!", "No quedan cupos...", etc.)
    mostrarMensaje(mensaje, json.mensaje, json.ok ? "exito" : "error");
    if (json.ok) {
      formulario.reset();
      cargarConcierto(); // actualiza los cupos
    }
  } catch (error) {
    mostrarMensaje(mensaje, "No se pudo conectar con el servidor. Intenta más tarde.", "error");
  } finally {
    boton.disabled = false;
  }
});

cargarConcierto();
