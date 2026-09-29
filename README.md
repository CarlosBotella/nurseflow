# NurseFlow

PWA local-first para una estudiante de Enfermería: universidad, Prácticum, consulta rápida y estudio. Está preparada para alojarse en GitHub Pages sin npm, compilación ni servidor propio.

## Qué incluye

- **Hoy**: resumen del Prácticum, accesos rápidos, clases del día y tareas.
- **Universidad**: semana tipo, excepciones por fecha, pendientes, espacio PAE y acceso a estudio.
- **Prácticum**: configuración de centro/servicio, registro del día, diario de casos anonimizado, relación patología-procedimiento-participación, portfolio, preparación de tutoría y resumen para la memoria.
- **Consulta**: CIMA/AEMPS, botiquín offline, escáner cuando el navegador soporta `BarcodeDetector`, entrada manual de código, La Batea con 30 técnicas editables, calculadoras, Glasgow/Barthel/Norton/Braden/EVA, analíticas orientativas, diccionario y CIE-11.
- **Estudio**: flashcards con repetición sencilla, preguntas originales tipo test, repaso derivado de casos y estadísticas.
- **Ajustes**: perfil, apariencia, privacidad, PIN/WebAuthn, autobloqueo, APIs, backup, importación, almacenamiento, modo offline, instalación y fuentes.
- **Offline**: IndexedDB + Service Worker. Horarios, casos, Batea, flashcards, escalas, calculadoras y botiquín guardado funcionan sin internet.

## Publicar gratis en GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube **el contenido de esta carpeta a la raíz** del repositorio (`index.html`, `app.js`, etc.).
3. En GitHub: `Settings > Pages > Build and deployment`.
4. Elige `Deploy from a branch`.
5. Selecciona `main` y `/ (root)`.
6. Espera a que GitHub publique la URL HTTPS.
7. En iPhone abre esa URL con Safari y usa `Compartir > Añadir a pantalla de inicio`.

La PWA no necesita un dominio propio.

## CIE-11: Cloudflare Worker gratuito

La API oficial de la OMS requiere OAuth2 con `client_id` y `client_secret`, por lo que esas credenciales no deben estar en el JavaScript público de GitHub Pages.

1. Registra una aplicación en el portal ICD API de la OMS y obtén `client id` y `client secret`.
2. Crea un Cloudflare Worker.
3. Copia el contenido de `worker.js`.
4. Añade dos secretos al Worker:
   - `WHO_CLIENT_ID`
   - `WHO_CLIENT_SECRET`
5. Despliega el Worker.
6. En NurseFlow entra en `Ajustes > APIs y fuentes` y pega la URL del Worker.
7. Pulsa `Probar`.

El Worker también ofrece `/cima` como proxy opcional de CIMA. Si la consulta directa desde Safari no funciona, selecciona `A través del Worker` en Ajustes.

## Privacidad

Los horarios, casos, procedimientos, tareas, flashcards y botiquín se guardan en IndexedDB dentro del navegador. NurseFlow no tiene una base de datos remota propia.

El diario se ha diseñado para registrar **casos de aprendizaje anonimizados**. No deben guardarse nombres, iniciales, SIP, historia clínica, habitación, fechas de nacimiento, fotografías ni otros datos que puedan identificar a un paciente.

El bloqueo mediante PIN o WebAuthn protege el acceso casual a la PWA, pero no convierte un registro identificativo en apropiado. La regla principal sigue siendo minimizar y anonimizar datos.

## Límites deliberados

- **NANDA-I / NIC / NOC**: la app incluye el espacio de trabajo e importación manual, pero no distribuye una base propietaria sin licencia.
- **CIE-11**: necesita el Worker configurado y conexión para nuevas búsquedas.
- **CIMA**: las nuevas consultas necesitan internet; los medicamentos guardados quedan offline.
- **Escáner**: usa `BarcodeDetector` si el navegador lo expone. Si no, se puede introducir el código manualmente.
- Las calculadoras, escalas, valores orientativos y material de técnicas son herramientas académicas. Deben contrastarse con las fuentes oficiales y protocolos del centro.

## Archivos

- `index.html` – shell de la PWA.
- `styles.css` – diseño responsive, safe areas de iPhone/iPad y modo oscuro.
- `db.js` – IndexedDB.
- `data.js` – contenido local inicial.
- `app.js` – lógica de la aplicación.
- `sw.js` – Service Worker y caché offline.
- `manifest.webmanifest` – instalación PWA.
- `worker.js` – backend opcional de Cloudflare para OMS/CIMA.

## Actualizaciones

Para publicar una nueva versión, sustituye los archivos del repositorio. Si cambias archivos estáticos, incrementa el nombre de `CACHE` en `sw.js` para forzar la actualización del contenido offline.
