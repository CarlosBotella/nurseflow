# NurseFlow 2.0 — archivos a sustituir

Esta actualización reemplaza únicamente estos archivos del proyecto existente:

- `app.js`
- `data.js`
- `styles.css`
- `sw.js`
- `worker.js` (solo en Cloudflare Worker; no se publica como frontend de GitHub Pages)

## Cambios principales

### Primera configuración
La primera apertura ya no presupone curso, hospital, servicio, fechas ni Prácticum. Cada usuario configura:

1. Nombre opcional.
2. Universidad.
3. Curso.
4. Asignaturas que realmente cursa.
5. Si ya tiene o no prácticas asignadas.

Los datos se guardan en IndexedDB del dispositivo.

### Horario UCV
Para UCV, el selector de asignaturas se precarga con el plan público del Grado en Enfermería. El alumno solo selecciona su asignatura y añade día, hora y aula. También puede crear actividades personalizadas.

Fuente incorporada en `data.js`:
https://www.ucv.es/oferta-academica/facultades/facultad-de-medicina-y-ciencias-de-la-salud/grado-en-enfermeria#estudios

### Prácticum
La pantalla de inicio no muestra `Nuevo caso`, `Registrar día` ni las métricas clínicas mientras no exista un Prácticum configurado y activo. El Prácticum se puede activar, editar o desactivar desde Ajustes.

### CIMA / AEMPS
La ficha de medicamentos usa:

- `GET medicamento`
- `GET docSegmentado/contenido/1`
- `GET notas`
- `GET materiales`
- `GET psuministro/:codNacional` cuando corresponde

La vista prioriza información útil para enfermería tomada de la ficha técnica oficial:

- principio activo, dosis, forma y vía;
- indicaciones (4.1);
- posología y forma de administración (4.2);
- contraindicaciones (4.3);
- advertencias y precauciones (4.4);
- interacciones (4.5);
- embarazo/lactancia cuando existe (4.6);
- reacciones adversas (4.8);
- sobredosis (4.9);
- incompatibilidades (6.2);
- periodo de validez (6.3);
- conservación (6.4);
- manipulación/preparación/eliminación (6.6);
- notas y materiales de seguridad AEMPS;
- problemas de suministro asociados a presentaciones.

La app no inventa una dilución, velocidad o compatibilidad si CIMA no la contiene.

## Cloudflare Worker

El Worker sigue siendo gratuito dentro de los límites del plan Free y es opcional para CIMA. Para CIE-11 es necesario configurar:

- `WHO_CLIENT_ID`
- `WHO_CLIENT_SECRET`

Rutas disponibles:

- `/health`
- `/icd/search?q=neumonia`
- `/cima/search?q=paracetamol`
- `/cima/medicine?nregistro=77758`
- `/cima/clinical?nregistro=77758`

Después de desplegarlo, introduce su URL en `Ajustes > APIs y fuentes` y selecciona `A través del Worker`.

## Actualización de la PWA

`sw.js` utiliza ahora:

`nurseflow-v2.0.0`

Al sustituir los archivos en GitHub Pages, el nuevo Service Worker elimina cachés anteriores durante `activate`. En futuras versiones cambia `CACHE_VERSION` (`v2.0.1`, `v2.0.2`, etc.).
