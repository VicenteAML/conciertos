const { crearApp } = require('./app');

const puerto = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const servidor = crearApp().listen(puerto, host, () => {
  console.log(`ConciertosYa disponible en http://localhost:${puerto}`);
  console.log(`Dirección de escucha: ${host}:${puerto}`);
  console.log('Para comprobar Firestore ejecuta: npm run check:firestore');
});
servidor.on('error', (error) => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exitCode = 1;
});
