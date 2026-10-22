// ===== Funciones que comparten las páginas =====

// Datos de prueba: se usan SOLO si el servidor (backend) todavía no está listo.
const CONCIERTOS_PRUEBA = [
  { id: 1, artista: "Los Bunkers", fecha: "2026-12-05T21:00", lugar: "Movistar Arena, Santiago", cupoTotal: 120, cuposDisponibles: 35 },
  { id: 2, artista: "Mon Laferte", fecha: "2026-11-20T20:30", lugar: "Teatro Caupolicán, Santiago", cupoTotal: 80, cuposDisponibles: 0 },
  { id: 3, artista: "Javiera Mena", fecha: "2027-01-15T22:00", lugar: "Teatro Municipal, Viña del Mar", cupoTotal: 60, cuposDisponibles: 12 },
  { id: 4, artista: "Chancho en Piedra", fecha: "2026-11-28T21:00", lugar: "Estadio Sausalito, Viña del Mar", cupoTotal: 200, cuposDisponibles: 150 },
  { id: 5, artista: "Denise Rosenthal", fecha: "2026-09-10T20:00", lugar: "Gran Arena Monticello", cupoTotal: 100, cuposDisponibles: 20 },
  { id: 6, artista: "Los Prisioneros Tributo", fecha: "2027-02-02T21:30", lugar: "Teatro Regional, Concepción", cupoTotal: 90, cuposDisponibles: 3 }
];

// Pide los conciertos al servidor. Si no responde, usa los datos de prueba.
async function obtenerConciertos() {
  try {
    const respuesta = await fetch("/api/conciertos");
    const json = await respuesta.json();
    if (json.ok) return { conciertos: json.datos, modoPrueba: false };
    throw new Error(json.mensaje);
  } catch (error) {
    return { conciertos: CONCIERTOS_PRUEBA, modoPrueba: true };
  }
}

// Convierte "2026-12-05T21:00" en "5 de diciembre de 2026, 21:00"
function formatearFecha(fechaTexto) {
  return new Date(fechaTexto).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });
}

// Muestra un mensaje de color: tipo = "exito", "error" o "info"
function mostrarMensaje(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "mensaje " + tipo;
}
