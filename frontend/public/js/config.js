// IIS sirve la página; la API se ejecuta en el puerto 3000 de la misma VM.
// Usa el nombre o IP que abrió el visitante, nunca localhost fijo.
// Si publicas la API en otra dirección, reemplaza apiBaseUrl por su URL.
const direccionApi = new URL(window.location.origin);
direccionApi.port = '3000';
window.CONFIG_CONCIERTOS = { apiBaseUrl: direccionApi.origin };
