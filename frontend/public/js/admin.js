/* La seguridad real está en el backend (las rutas /api/admin exigen token). Esta página solo muestra u oculta el login o el panel.*/
const CLAVE_TOKEN = "admin_token"; // el token vive en sessionStorage: se borra al cerrar la pestaña

const panelLogin = document.getElementById("panel-login");
const panelAdmin = document.getElementById("panel-admin");
const formLogin = document.getElementById("form-login");
const formConcierto = document.getElementById("form-concierto");
const tarjetaForm = document.getElementById("tarjeta-form");
const tituloForm = document.getElementById("titulo-form");
const tabla = document.getElementById("tabla-conciertos");
const mensaje = document.getElementById("mensaje");

let conciertos = [];
let editandoId = null; // null = creando uno nuevo

const obtenerToken = () => sessionStorage.getItem(CLAVE_TOKEN);

function limpiarMensaje() {
  mensaje.textContent = "";
  mensaje.className = "";
}

// Llama a la API con el token. Siempre devuelve un objeto { ok, mensaje, ... }.
async function api(ruta, opciones = {}) {
  const token = obtenerToken();
  try {
    const respuesta = await fetch(urlApi(ruta), {
      ...opciones,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: "Bearer " + token }) }
    });
    const json = await respuesta.json().catch(() => ({}));
    // Token vencido o inválido: vuelve al login
    if (respuesta.status === 401 && token) {
      cerrarSesion("Tu sesión expiró. Inicia sesión de nuevo.", "info");
    }
    return json.ok === undefined ? { ok: false, mensaje: "Respuesta inesperada del servidor." } : json;
  } catch (error) {
    return { ok: false, mensaje: "No se pudo conectar con el servidor. Intenta más tarde." };
  }
}

function mostrarLogin() {
  panelLogin.hidden = false;
  panelAdmin.hidden = true;
}

function mostrarPanel() {
  panelLogin.hidden = true;
  panelAdmin.hidden = false;
  cargarConciertos();
}

function cerrarSesion(texto, tipo) {
  sessionStorage.removeItem(CLAVE_TOKEN);
  ocultarFormulario();
  mostrarLogin();
  if (texto) mostrarMensaje(mensaje, texto, tipo);
  else limpiarMensaje();
}

formLogin.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const usuario = formLogin.elements.usuario.value.trim();
  const password = formLogin.elements.password.value;
  if (!usuario || !password) return mostrarMensaje(mensaje, "Ingresa usuario y contraseña.", "error");

  const boton = formLogin.querySelector("button");
  boton.disabled = true;
  const respuesta = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ usuario, password })
  });
  boton.disabled = false;

  if (!respuesta.ok) return mostrarMensaje(mensaje, respuesta.mensaje, "error");
  sessionStorage.setItem(CLAVE_TOKEN, respuesta.token);
  formLogin.reset();
  limpiarMensaje();
  mostrarPanel();
});

document.getElementById("btn-salir").addEventListener("click", () => cerrarSesion());

async function cargarConciertos() {
  const respuesta = await api("/api/conciertos");
  if (!respuesta.ok) {
    tabla.innerHTML = '<tr><td colspan="5" class="vacio">No se pudieron cargar los conciertos.</td></tr>';
    return mostrarMensaje(mensaje, respuesta.mensaje, "error");
  }
  conciertos = respuesta.datos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  dibujarTabla();
}

function dibujarTabla() {
  if (conciertos.length === 0) {
    tabla.innerHTML = '<tr><td colspan="5" class="vacio">Aún no hay conciertos. Crea el primero.</td></tr>';
    return;
  }
  tabla.innerHTML = conciertos.map((c) => `
    <tr>
      <td>${escaparHtml(c.artista)}</td>
      <td>${escaparHtml(formatearFecha(c.fecha))}</td>
      <td>${escaparHtml(c.lugar)}</td>
      <td>${escaparHtml(c.cuposDisponibles)} / ${escaparHtml(c.cupoTotal)}</td>
      <td>
        <div class="acciones">
          <button type="button" class="boton secundario chico" data-accion="editar" data-id="${escaparHtml(c.id)}">Editar</button>
          <button type="button" class="boton peligro chico" data-accion="eliminar" data-id="${escaparHtml(c.id)}">Eliminar</button>
        </div>
      </td>
    </tr>`).join("");
}

// Un solo listener para todos los botones de la tabla
tabla.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;
  const concierto = conciertos.find((c) => c.id === Number(boton.dataset.id));
  if (!concierto) return;
  if (boton.dataset.accion === "editar") abrirFormulario(concierto);
  if (boton.dataset.accion === "eliminar") eliminarConcierto(concierto);
});

// Convierte "2026-12-05T21:00:00.000Z" al formato que usa <input type="datetime-local">
function aValorLocal(fechaIso) {
  const f = new Date(fechaIso);
  const dos = (n) => String(n).padStart(2, "0");
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}T${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

function abrirFormulario(concierto) {
  limpiarMensaje();
  editandoId = concierto ? concierto.id : null;
  tituloForm.textContent = concierto ? "Editar concierto" : "Nuevo concierto";
  formConcierto.elements.artista.value = concierto ? concierto.artista : "";
  formConcierto.elements.fecha.value = concierto ? aValorLocal(concierto.fecha) : "";
  formConcierto.elements.lugar.value = concierto ? concierto.lugar : "";
  formConcierto.elements.cupoTotal.value = concierto ? concierto.cupoTotal : "";
  tarjetaForm.hidden = false;
  tarjetaForm.scrollIntoView({ behavior: "smooth", block: "start" });
  formConcierto.elements.artista.focus();
}

function ocultarFormulario() {
  tarjetaForm.hidden = true;
  formConcierto.reset();
  editandoId = null;
}

document.getElementById("btn-nuevo").addEventListener("click", () => abrirFormulario(null));
document.getElementById("btn-cancelar").addEventListener("click", ocultarFormulario);

formConcierto.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const artista = formConcierto.elements.artista.value.trim();
  const lugar = formConcierto.elements.lugar.value.trim();
  const fecha = new Date(formConcierto.elements.fecha.value);
  const cupoTotal = Number(formConcierto.elements.cupoTotal.value);

  // Validaciones simples (el backend vuelve a validar todo)
  if (!artista || !lugar || !formConcierto.elements.fecha.value || !formConcierto.elements.cupoTotal.value) {
    return mostrarMensaje(mensaje, "Completa todos los campos.", "error");
  }
  if (Number.isNaN(fecha.getTime())) {
    return mostrarMensaje(mensaje, "Ingresa una fecha y hora válidas.", "error");
  }
  if (!Number.isInteger(cupoTotal) || cupoTotal < 1) {
    return mostrarMensaje(mensaje, "El cupo total debe ser un número entero mayor a 0.", "error");
  }

  const boton = formConcierto.querySelector('button[type="submit"]');
  boton.disabled = true;
  const respuesta = await api(
    editandoId ? `/api/admin/conciertos/${editandoId}` : "/api/admin/conciertos",
    {
      method: editandoId ? "PUT" : "POST",
      // toISOString() guarda la hora exacta sin depender de la zona horaria del servidor
      body: JSON.stringify({ artista, lugar, fecha: fecha.toISOString(), cupoTotal })
    }
  );
  boton.disabled = false;

  if (!respuesta.ok) return mostrarMensaje(mensaje, respuesta.mensaje, "error");
  mostrarMensaje(mensaje, editandoId ? "Concierto actualizado." : "Concierto creado.", "exito");
  ocultarFormulario();
  cargarConciertos();
});

async function eliminarConcierto(concierto) {
  if (!confirm(`¿Eliminar el concierto de "${concierto.artista}"? Esta acción no se puede deshacer.`)) return;
  const respuesta = await api(`/api/admin/conciertos/${concierto.id}`, { method: "DELETE" });
  mostrarMensaje(mensaje, respuesta.mensaje, respuesta.ok ? "exito" : "error");
  if (respuesta.ok) cargarConciertos();
}

async function iniciar() {
  if (!obtenerToken()) return mostrarLogin();
  const respuesta = await api("/api/admin/sesion");
  if (respuesta.ok) mostrarPanel();
  else if (obtenerToken()) cerrarSesion(respuesta.mensaje, "error"); // error de red u otro
  else mostrarLogin();                     // api() ya cerró la sesión por 401
}

iniciar();
