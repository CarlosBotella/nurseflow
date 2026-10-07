# NurseFlow

PWA local para organización académica, prácticas y consulta de enfermería. HTML, CSS y JavaScript vanilla, sin instalación de dependencias ni compilación para utilizarla.

## Instalación y actualización

1. Descomprime el ZIP y copia **todo el contenido de la carpeta `nurseflow`** a la raíz del repositorio que publica GitHub Pages. Conserva la estructura `styles/`, `scripts/` y `assets/`.
2. Publica en el mismo dominio y ruta que utilizabas. Los datos de IndexedDB pertenecen al origen del navegador: otro dominio, navegador o perfil no comparte esos datos.
3. Abre la web con conexión, espera a que cargue y cierra y vuelve a abrir la PWA. Si hay otra ventana de la versión anterior, ciérrala también.
4. No borres los datos del sitio para actualizar. Puedes exportar una copia desde Ajustes → Base de datos antes de sustituir archivos.

Para probar en un ordenador: ejecuta `python3 -m http.server 8000` dentro de esta carpeta y abre `http://localhost:8000`. Usa HTTPS al publicarla. Abrir el HTML con doble clic no permite verificar correctamente el service worker.

## Qué incluye esta versión

- Hoja de estilos separada en tokens, base, layout y componentes.
- Inicio contextual y sección Consulta con las herramientas existentes.
- Configuración de universidad neutral y prácticas opcionales.
- Formularios de caso en cuatro grupos y autocompletado con teclado y toque.
- Navegación inferior en móvil y lateral desde 900 px.
- Modales con gestión de foco, cancelación con Escape y fondo inerte.
- Tema claro/oscuro, modo guantes y controles de solo lectura.
- Recursos locales precacheados para funcionar sin conexión después de la primera carga.

## Archivos reales

- `index.html`: estructura inicial, navegación y paneles.
- `styles/tokens.css`: colores, escalas y variables semánticas.
- `styles/base.css`: elementos básicos, tipografía y accesibilidad global.
- `styles/layout.css`: distribución, navegación y breakpoints.
- `styles/components.css`: componentes y utilidades de presentación.
- `scripts/app.js`: funciones originales de datos, consultas, renderizado y eventos, con los cambios de interfaz.
- `scripts/ui.js`: accesibilidad, foco, combobox, estados visuales y vista Consulta.
- `sw.js`: service worker y precache.
- `manifest.webmanifest`: instalación de la PWA.
- `assets/icons/`: iconos de instalación.
- `docs/UI-SYSTEM.md`: contrato de interfaz para futuras modificaciones.
- `docs/UI-REFACTOR-STATUS.md`: estado individual de las 45 tareas y límites de validación.
- `docs/VALIDATION.json`: resultados de comprobaciones automatizadas.

## Conexiones y datos

Esta entrega conserva las conexiones del repositorio de origen: CIMA se consulta directamente en AEMPS y CIE-11 usa el Worker referenciado en `scripts/app.js`. El código del Worker no formaba parte del repositorio y no se incluye ni se modifica. Las nuevas búsquedas remotas necesitan internet; las fichas guardadas se consultan localmente.

Se mantienen `NurseFlowDB`, su versión y los almacenes originales. No se incluyen datos personales ni registros de prueba en el ZIP. No se han modificado las fórmulas de las calculadoras ni el contenido clínico de partida. Este trabajo es un refactor de interfaz, no una revisión de la exactitud clínica del contenido.

## Validación

Consulta `docs/UI-REFACTOR-STATUS.md`. Se diferencia entre pruebas de navegador, APIs simuladas y validación pendiente en dispositivos físicos/lector de pantalla.
