const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function obtenerConfigAuth() {
  return {
    secreto: process.env.JWT_SECRET,
    usuario: process.env.ADMIN_USUARIO,
    password: process.env.ADMIN_PASSWORD,
    expira: process.env.JWT_EXPIRA || '2h'
  };
}

module.exports = { obtenerConfigAuth };