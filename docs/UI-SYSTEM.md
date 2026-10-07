# Sistema de interfaz

## Arquitectura

Aplicación vanilla sin build. `index.html` carga tokens → base → layout → components; después carga app.js → ui.js mediante defer. El arranque se ejecuta en DOMContentLoaded. No introducir dependencias CDN.

Los helpers de renderizado conservan los atributos `data-action`, `data-view` y `data-id` y los nombres de campos utilizados por los handlers. Las funciones de datos y sus contratos siguen en app.js. No cambiar el esquema de IndexedDB para modificaciones visuales.

## Tokens

Usar `--surface`, `--surface-raised`, `--surface-subtle`, `--text-primary`, `--text-secondary`, `--border`, `--accent`, `--success`, `--warning` y `--danger`. Los alias originales (`--bg-card`, `--primary`, etc.) mantienen compatibilidad.

Espaciados: `--space-1/2/3/4/6/8` equivalen a 4/8/12/16/24/32 px. Tipografía: display, page, section, card, body, small, caption. Caption queda reservado para metadatos. El modo guantes aumenta la fuente raíz y `--touch-target` de 48 a 56 px.

Las variables de color tienen variantes de tema explícito y del sistema. La superficie hero conserva un fondo oscuro con texto blanco. Los indicadores semánticos necesitan texto o señal adicional al color.

## Componentes

- Botón: `.btn` con `.primary`, `.secondary`, `.ghost`, `.danger` o `.icon-only`. No definir tamaños que reduzcan el área táctil. Usar type=button salvo envío de formulario.
- Tarjeta: `.card`, `.card--hero`, `.card--warning`, `.card--danger`, `.card--result`, `.card--interactive`. `.hero` continúa como alias legado.
- Lista: `UIHelpers.listRow({title, sub, icon, badge, action, id})`. Si action está vacío se genera un contenedor informativo; si existe, un botón. No anidar botones dentro de filas interactivas.
- Formularios: `.form-field`, `.form-label`, `.form-help`, `.form-error`, `.form-group`; agrupar con fieldset/legend. Cada campo debe tener etiqueta o nombre accesible específico. Validación nativa enlazada con aria-invalid y aria-describedby.
- Feedback: `.notice`, `.empty-state`, `.toast`. Usar status para actualizaciones informativas y alert solo para errores inmediatos; no anunciar como urgentes todos los avisos estáticos.

Las utilidades de presentación son composables (`mt-4`, `mb-2`, `display-flex`, `text-small`, etc.). Preferir variantes de componente para nuevas vistas. Solo se permite estilo inline para valores derivados del estado que no admiten una clase finita, como porcentaje de progreso. Los estados done, canceled y critical usan clases.

## Layout y navegación

- Menos de 480 px: formularios a una columna, búsqueda y ajustes visibles en topbar; modos disponibles desde Ajustes.
- 480–899 px: mayor espacio de contenido y grids según su ancho mínimo.
- Desde 900 px: los mismos controles de navegación pasan a un rail de 112 px; contenido máximo de 1100 px.

El calendario tiene scroll horizontal interno cuando siete targets de 48/56 px no caben. Ese scroll se identifica como región y permite foco; la página no debe desbordarse horizontalmente.

Respetar safe-area-inset-top/bottom en shell, navegación, paneles y onboarding. El viewport permite zoom. No usar overflow-x:hidden global para ocultar errores de layout.

## Foco y diálogos

Modal y slide-over se identifican con role=dialog, aria-modal y un título. La capa activa vuelve inertes las demás. Tab y Shift+Tab permanecen en ella. Escape cancela el modal o cierra el panel; nunca confirma una eliminación.

Al cerrar un modal sobre un panel, se recupera el foco del control del panel. Al cerrar el panel, se vuelve al origen si existe; en su defecto, al contenido principal. No acumular listeners por apertura.

`ClinicalUI` aplica las asociaciones y estados a subárboles modificados mediante un observador acotado por registros de mutación. Evitar trabajo de datos dentro de este ciclo y no añadir escrituras de atributos/clases que se repitan sin cambios. Los componentes nuevos deben incluir semántica explícita desde su plantilla.

## Autocompletado y solo lectura

El diagnóstico mantiene foco en el input combobox. Las opciones pertenecen a un listbox, con aria-activedescendant y aria-selected. Flechas cambian opción, Enter selecciona sin enviar y Escape cierra la lista. Las respuestas antiguas se descartan y las solicitudes previas se abortan.

El modo solo lectura deshabilita escrituras y las bloquea también en eventos de captura, incluidos formularios que ya estaban abiertos. Consulta, búsqueda, calculadoras y exportación siguen disponibles. Al añadir una acción persistente, incorporarla al catálogo de acciones/formularios de escritura de ui.js.

## Offline y control de cambios

Cualquier CSS, JS o asset imprescindible nuevo debe incluirse en ASSETS de sw.js. Incrementar CACHE_NAME al publicar cambios. Verificar rutas relativas bajo subdirectorios y recarga offline tras una primera carga completa.

Comprobar los cuatro tamaños de referencia, ambos temas, modo guantes, navegación con teclado, persistencia y los flujos modificados. No confundir un análisis automático de accesibilidad con una prueba real en VoiceOver/TalkBack.
