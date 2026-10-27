const formulario = document.getElementById("form-consulta");
const mensaje = document.getElementById("mensaje");
const resultados = document.getElementById("resultados");

function limpiar() {
    mensaje.textContent = "";
    mensaje.className = "";
    resultados.innerHTML = "";
}

function tarjetaInscripcion(i) {
    const f = new Date(i.fecha);
    const fecha = f.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
    const hora = f.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    const proximo = f.getTime() > Date.now();
    const inscritoEn = i.inscritoEn
        ? new Date(i.inscritoEn).toLocaleDateString("es-CL", { dateStyle: "long" })
        : "—";

    return `
    <article class="tarjeta">
      <h2>${escaparHtml(i.artista)}</h2>
      <div class="datos">
        <div class="dato"><span>Fecha</span><strong>${escaparHtml(fecha)}</strong></div>
        <div class="dato"><span>Hora</span><strong>${escaparHtml(hora)}</strong></div>
        <div class="dato ancho"><span>Lugar</span><strong>${escaparHtml(i.lugar)}</strong></div>
        <div class="dato"><span>Estado</span><strong class="${proximo ? "amarillo" : ""}">${proximo ? "Próximo" : "Finalizado"}</strong></div>
        <div class="dato"><span>Inscrito el</span><strong>${escaparHtml(inscritoEn)}</strong></div>
      </div>
    </article>`;
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiar();

    const rut = formulario.elements.rut.value.trim();
    const correo = formulario.elements.correo.value.trim();

    if (!rut || !correo) {
        return mostrarMensaje(mensaje, "Completa todos los campos.", "error");
    }
    if (!/^\d{7,8}-[\dkK]$/.test(rut)) {
        return mostrarMensaje(mensaje, "Ingresa el RUT sin puntos y con guion (ej: 12345678-5).", "error");
    }
    if (!/^\S+@\S+\.\S+$/.test(correo)) {
        return mostrarMensaje(mensaje, "Ingresa un correo válido.", "error");
    }

    const boton = formulario.querySelector("button");
    boton.disabled = true;

    try {
        const respuesta = await fetch(urlApi("/api/mis-inscripciones"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rut, correo })
        });
        const json = await respuesta.json();

        if (!json.ok) return mostrarMensaje(mensaje, json.mensaje, "error");
        if (json.datos.length === 0) {
            return mostrarMensaje(mensaje, "No encontramos inscripciones con esos datos. Revisa tu RUT y correo.", "info");
        }

        mostrarMensaje(mensaje, `Tienes ${json.datos.length} inscripción(es).`, "exito");
        resultados.innerHTML = json.datos.map(tarjetaInscripcion).join("");
    } catch (error) {
        mostrarMensaje(mensaje, "No se pudo conectar con el servidor. Intenta más tarde.", "error");
    } finally {
        boton.disabled = false;
    }
});