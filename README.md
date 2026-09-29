# NurseFlow PWA

PWA local-first para una estudiante de Enfermería. Está pensada para funcionar en GitHub Pages sin proceso de compilación.

## Qué incluye esta versión

- Pantalla Hoy con accesos rápidos.
- Semana tipo local para Universidad.
- Prácticum con configuración, registro de casos anonimizados y recordatorio de asistencia UCV.
- Relación caso → procedimientos → grado de participación.
- Portfolio automático de procedimientos.
- La Batea editable y local.
- Consulta a CIMA/AEMPS y caché local de medicamentos consultados.
- Calculadoras educativas: ml/h, goteo e IMC.
- Escala de Glasgow como suma estructurada.
- Flashcards y cola de repaso desde el diario.
- IndexedDB para persistencia local.
- Service Worker para funcionamiento offline de la app.
- Worker opcional para CIE-11/OMS.
- Modo claro/oscuro automático.

## Privacidad

Los casos se guardan exclusivamente en IndexedDB del navegador. La interfaz evita campos identificativos y muestra avisos para no registrar nombre, iniciales, SIP, historia clínica, habitación/cama o fotografías del paciente.

**Importante:** esta app es una herramienta académica y organizativa. No sustituye supervisión clínica, protocolos del centro, ficha técnica, rangos oficiales del laboratorio ni UCVEalúa.

## Publicar gratis en GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `nurseflow`.
2. Sube todos los archivos de esta carpeta manteniendo la estructura.
3. En GitHub abre **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Elige la rama `main` y carpeta `/ (root)`.
6. Guarda. GitHub mostrará la URL de la PWA.
7. Abre esa URL en Safari en el iPhone y usa **Compartir → Añadir a pantalla de inicio**.

## CIE-11 con Cloudflare Worker (opcional)

El archivo `worker.js` contiene un Worker para actuar como backend de la API oficial WHO ICD-11. No lo subas como secreto: el código puede ser público, pero las credenciales deben configurarse como Secrets en Cloudflare.

Secrets:
- `WHO_CLIENT_ID`
- `WHO_CLIENT_SECRET`

Variable recomendada:
- `ALLOWED_ORIGIN=https://TU_USUARIO.github.io`

Después de desplegar el Worker, abre NurseFlow → **Prácticum → Configurar prácticum** y pega la URL del Worker.

La API de OMS usa OAuth2 Client Credentials y requiere la cabecera `API-Version: v2`. El Worker está configurado para la release ICD-11 MMS `2026-01` en español.

## CIMA / AEMPS

La búsqueda usa la API pública CIMA con:

`https://cima.aemps.es/cima/rest/medicamentos?nombre=...`

Y para el detalle:

`https://cima.aemps.es/cima/rest/medicamento?nregistro=...`

Si CIMA bloquea una llamada directa desde un navegador por CORS o cambia su API, conviene enrutar también CIMA a través del Worker.

## Desarrollo local

Los Service Workers necesitan HTTP/HTTPS. No abras `index.html` directamente con `file://`.

Por ejemplo:

```bash
python3 -m http.server 8080
```

Luego abre `http://localhost:8080`.

## Copia de seguridad

La capa `db.js` ya incluye `exportAll()` e `importAll()` para implementar exportación/importación cifrada en una siguiente versión. La interfaz de backup todavía no está expuesta en esta primera entrega.

## Próximos módulos previstos

- Excepciones de calendario por fecha.
- Vista calendario completa.
- Backup cifrado exportable/importable.
- Bloqueo del diario mediante WebAuthn/passkeys cuando la estrategia esté validada en iOS.
- Analíticas y diccionario con fuentes curadas.
- Barthel, Norton y Braden con criterios y referencias verificadas.
- Escáner de códigos de medicamento.
- NANDA/NIC/NOC sujeto a licencia/fuente autorizada.
- Modo de preparación de tutoría y generador de material para la memoria.
