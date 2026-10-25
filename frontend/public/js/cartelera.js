// ===== Página Cartelera =====
const lista = document.getElementById("lista-conciertos");
const aviso = document.getElementById("aviso");
const buscador = document.getElementById("buscador");
let conciertos = [];

// 1. Al abrir la página, pide los conciertos y los muestra
async function iniciar() {
  const resultado = await obtenerConciertos();
  conciertos = resultado.conciertos;
  if (resultado.modoPrueba) {
    mostrarMensaje(aviso, "Mostrando datos de prueba (el servidor aún no está conectado).", "info");
  }
  mostrarConciertos(conciertos);
}

// 2. Dibuja una tarjeta por concierto
function mostrarConciertos(listaConciertos) {
  if (listaConciertos.length === 0) {
    lista.innerHTML = '<p class="vacio">No se encontraron conciertos.</p>';
    return;
  }

  lista.innerHTML = listaConciertos.map(c => {
    const yaPaso = new Date(c.fecha) < new Date();
    const agotado = c.cuposDisponibles <= 0;

    // Según el estado, se muestra el botón o un aviso
    let accion;
    if (yaPaso) accion = '<span class="estado">Finalizado</span>';
    else if (agotado) accion = '<span class="estado agotado">Agotado</span>';
    else accion = `<a class="boton" href="html/inscripcion.html?id=${c.id}">Inscribirme</a>`;

    return `
      <article class="tarjeta">
        <h2>${escaparHtml(c.artista)}</h2>
        ${datosConcierto(c)}
        ${accion}
      </article>`;
  }).join("");
}

// 3. Buscador: filtra mientras el usuario escribe
buscador.addEventListener("input", () => {
  const texto = buscador.value.toLowerCase();
  const filtrados = conciertos.filter(c =>
    c.artista.toLowerCase().includes(texto) || c.lugar.toLowerCase().includes(texto)
  );
  mostrarConciertos(filtrados);
});

iniciar();
