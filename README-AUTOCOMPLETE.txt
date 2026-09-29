NurseFlow v2.0.1 — Autocompletado CIE-11

Sustituye en tu repositorio de GitHub Pages:
- app.js
- sw.js

Qué cambia:
- En Nuevo/Editar caso ya no hace falta pulsar "Buscar CIE-11".
- Al escribir 3 o más caracteres en Patología / diagnóstico, NurseFlow consulta automáticamente CIE-11 mediante el Worker configurado en Ajustes.
- Las sugerencias aparecen debajo del campo mientras escribes.
- Al pulsar una sugerencia, se completan el diagnóstico y su código CIE-11 en el caso.
- Si después modificas manualmente el diagnóstico, el código CIE anterior se elimina para evitar asociaciones incorrectas.
- Incluye navegación con flechas, Enter y Escape en teclado.
- sw.js pasa a nurseflow-v2.0.1 para forzar la actualización del app.js en la PWA instalada.

Requisito:
- La URL del Cloudflare Worker debe estar guardada en Ajustes > APIs y fuentes.
- El Worker debe tener WHO_CLIENT_ID y WHO_CLIENT_SECRET configurados para que CIE-11 responda.
