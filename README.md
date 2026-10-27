# Conciertos

El proyecto se organiza en frontend y backend.

```text
frontend/
  public/
    index.html
    inscripcion.html
    css/
    img/
    js/
backend/
  src/
    config/
    routes/
    controllers/
    services/
    repositories/
```

## Frontend

La interfaz existente está en `frontend/public`. Las rutas relativas de HTML,
CSS, imágenes y JavaScript se mantienen.

Configura `frontend/public` como directorio público del servidor o del servicio
de alojamiento. La interfaz utiliza estas rutas de la API:

- `GET /api/conciertos`: devuelve `{ ok: true, datos: [...] }`.
- `POST /api/inscripciones`: recibe `{ conciertoId, nombre, rut, correo }`
  y devuelve `{ ok: true, mensaje: "..." }` en caso de éxito.

Si la API no está disponible, la cartelera muestra datos de prueba y las
inscripciones no se guardan.

## Backend

La estructura está preparada para implementar una API por capas:

- `config`: inicialización de servicios, por ejemplo Firestore.
- `routes`: definición de rutas HTTP.
- `controllers`: lectura de solicitudes y construcción de respuestas.
- `services`: reglas de negocio, validación de cupos y duplicados.
- `repositories`: consultas y escrituras en la base de datos.

Flujo previsto: rutas → controladores → servicios → repositorios → Firestore.

El backend usa Express y Firebase Admin. Sirve tanto la página como la API desde
el mismo origen. Las inscripciones se guardan junto con el descuento de cupos en
una transacción. Un mismo RUT no puede inscribirse dos veces al mismo concierto.
El servidor verifica el dígito del RUT, el correo y que el concierto no haya
finalizado. No hay un endpoint público para leer datos personales.

## Configurar Firestore

1. En la [consola de Firebase](https://console.firebase.google.com/), crea o
   selecciona un proyecto. Crea una base de datos Cloud Firestore Standard en
   modo producción, con identificador `(default)`.
2. En Configuración del proyecto → Cuentas de servicio → SDK de Firebase Admin,
   genera una clave privada para desarrollo local. Guárdala en
   `backend/secrets/service-account.json`. Esta carpeta está ignorada por Git.
   No compartas la clave ni la pongas en el frontend.
3. Desde la raíz del proyecto, ejecuta en PowerShell:

   ```powershell
   npm install
   Copy-Item backend/.env.example backend/.env
   ```

4. Edita `backend/.env`: cambia `FIREBASE_PROJECT_ID` por el ID real del proyecto
   (no su nombre visible). La ruta de `GOOGLE_APPLICATION_CREDENTIALS` es relativa
   a `backend/`, o puede ser absoluta. Usa `/` en las rutas de Windows.
5. Comprueba el acceso, sin escribir datos:

   ```powershell
   npm run check:firestore
   ```

   Debe mostrar «Conexión con Firestore verificada». Si la colección está vacía,
   el comando también lo indicará. Un error de permisos requiere revisar la
   cuenta de servicio y sus permisos IAM sobre el proyecto.

En entornos de Google Cloud con una identidad de servicio configurada puedes
omitir `GOOGLE_APPLICATION_CREDENTIALS` y usar las credenciales predeterminadas
del entorno. La cuenta debe tener permisos de lectura/escritura de Firestore.
Referencia: [Firebase Admin](https://firebase.google.com/docs/admin/setup).

## Crear el primer concierto

Para cargar seis conciertos ficticios de ejemplo en el proyecto configurado en
`backend/.env`, ejecuta desde la raíz:

```powershell
npm run seed:conciertos
```

Usa los IDs `1001` a `1006`, incluye un concierto agotado y otro con pocos cupos.
Puedes repetir el comando: conserva los documentos existentes y no restablece
sus cupos. Los nombres y fechas son ejemplos, no eventos reales anunciados.

Desde la consola de Firestore crea una colección `conciertos` y un documento con
ID `1`. Todos los conciertos deben usar IDs numéricos enteros positivos.

| Campo | Tipo | Ejemplo |
| --- | --- | --- |
| artista | string | Banda de ejemplo |
| fecha | string | 2027-01-15T21:00:00-03:00 |
| lugar | string | Santiago |
| cupoTotal | number (entero) | 100 |
| cuposDisponibles | number (entero) | 100 |

También se admite `fecha` como Timestamp de Firestore. Usa una fecha futura para
probar inscripciones. La API obtiene el ID desde el identificador del documento.
La colección `inscripciones` se crea automáticamente al registrar la primera
inscripción. No necesitas precargar datos personales ni crear esa colección.

## Ejecutar

Desde la raíz, donde está `package.json`:

```powershell
npm start
```

Abre [http://localhost:3000](http://localhost:3000). También puedes servir el
frontend con IIS siguiendo la sección siguiente. No abras el HTML directamente.
`npm run dev` reinicia Node al cambiar archivos y `npm test` ejecuta
pruebas locales con dobles de Firestore, sin acceder a una base real.

Si ves conciertos de prueba, la consulta real a Firestore falló; revisa la
terminal y ejecuta el comando de comprobación. Una colección real vacía produce
una cartelera vacía. Los datos de prueba del navegador no se guardan en Firestore.

## Acceso y despliegue

`firestore.rules` contiene reglas para denegar todo acceso directo desde clientes.
Puedes copiarlas en la pestaña Reglas de Firestore y publicarlas. El archivo por
sí solo no cambia las reglas del proyecto. Firebase Admin utiliza permisos IAM y
no está limitado por estas reglas.

La dirección de escucha se configura con `HOST`. El valor predeterminado si no
se configura es `127.0.0.1`; `.env.example` usa `0.0.0.0` para el despliegue con
IIS y API en puertos separados. Antes de publicar datos personales o usar el
login de administrador en Internet, configura HTTPS para frontend y API. Esta
implementación no incluye despliegue serverless.

## IIS sin extensiones de proxy

1. Copia los archivos actualizados del frontend y backend a la VM. En IIS apunta
   la ruta física únicamente a `frontend/public` y habilita `index.html` como
   documento predeterminado. No publiques la raíz del proyecto.
2. Conserva las credenciales de la VM y añade a `backend/.env`:

   ```env
   PORT=3000
   HOST=0.0.0.0
   CORS_ORIGINS=http://68.211.89.17,http://localhost,http://127.0.0.1
   ```

   Si cambias la IP, el dominio o el puerto de IIS, actualiza `CORS_ORIGINS` con
   el origen exacto (protocolo, nombre/IP y puerto no estándar), sin barra final.
   CORS no reemplaza la autenticación del administrador.
3. Reinicia Node o la tarea programada que lo ejecuta. Permite tráfico TCP
   entrante al puerto 3000 en el Firewall de Windows y en la red del proveedor de
   la VM; IIS seguirá recibiendo el frontend en el puerto 80.
4. Desde otro equipo comprueba `http://68.211.89.17:3000/api/conciertos` y luego
   abre `http://68.211.89.17`. Recarga sin caché (Ctrl+F5).

`frontend/public/js/config.js` dirige la API al puerto 3000 del mismo nombre o IP
con el que el visitante abrió el sitio. No usa `localhost` fijo. Las peticiones
de cartelera, inscripción y administración comparten esta configuración. Si la
API tiene otra URL, cambia `apiBaseUrl` en ese archivo. En el desarrollo local
por Node sigue funcionando `http://localhost:3000`.

Este ejemplo usa HTTP. Si IIS usa HTTPS, la API también necesita HTTPS con un
certificado válido y su URL debe configurarse en `config.js`; Node no incorpora
TLS automáticamente al cambiar el protocolo. El navegador bloquea las consultas
HTTP desde una página HTTPS. Referencia: [CORS en MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).

La revisión de dependencias detectó ocho avisos moderados heredados de
Firebase Admin 13 y su dependencia transitiva `uuid`, sin avisos altos ni
críticos. No se aplicó `npm audit fix --force`, que propone cambiar a una versión
mayor anterior del SDK. Revisa `npm audit` y actualiza el SDK y Node a versiones
compatibles antes de desplegar en producción.
