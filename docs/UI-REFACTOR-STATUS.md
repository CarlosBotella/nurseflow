# Estado del refactor UI/UX

Base: commit `3f58c05177476252f60300280fd12fed1f7fb8ad` de CarlosBotella/nurseflow. Entrega: 7 de octubre de 2026.

## Resultado y límites

Implementados los cambios de interfaz de las tres fases. Se detallan las 45 tareas individualmente. La tarea 3.21 queda parcialmente validada porque no se ha ejecutado un lector de pantalla real. No se ha probado instalación ni funcionamiento en un iPhone/iPad físico; los tamaños se comprobaron con Chromium automatizado. Las conexiones CIMA/CIE-11 se probaron mediante respuestas simuladas: esto verifica el flujo de interfaz, no la disponibilidad de los servicios reales.

No se cambian el esquema/implementación de IndexedDB, los datos clínicos iniciales ni las expresiones de las calculadoras (comparación directa con el commit de origen). Se mantienen las fechas y reglas de prácticas existentes. Las APIs y el Worker no se sustituyen.

## Comprobaciones

- Sintaxis de app.js, ui.js y sw.js.
- Onboarding, creación/edición de caso, cancelación de borrado, tareas, registro diario, flashcards y repaso.
- Combobox con teclado, selección, plantilla de contexto y respuestas fuera de orden, con API simulada.
- Modal/panel, devolución del foco y Tab/Shift+Tab/Escape.
- Solo lectura, incluido formulario ya abierto; importación y borrado bloqueados; calculadoras y exportación disponibles.
- Calculadoras: infusión 500/4 = 125 y PAM 120/80 = 93,33.
- Cuatro resoluciones, seis vistas principales, modo normal/guantes, formularios representativos sin desbordamiento horizontal.
- Auditoría axe-core WCAG A/AA en vistas principales claro/oscuro y formularios/modales. Véase el resultado exacto en VALIDATION.json.
- Recarga offline con assets completos y conservación de casos en IndexedDB.
- Recursos de precache existentes y solo un estilo inline dinámico de progreso.

## 1. Fundamentos y sistema de diseño

| Tarea | Estado | Implementación | Archivos |
|---|---|---|---|
| 1.1 · Separación CSS | Completada | tokens, base, layout y components cargados en orden. | index.html; styles/*.css |
| 1.2 · Tokens semánticos | Completada | Superficies, estados, espaciados, tipografía y alias compatibles; variantes claro/oscuro/sistema. | styles/tokens.css |
| 1.3 · Estados sin dependencia exclusiva del color | Completada | Textos Correcta/Incorrecta, estados de diagnóstico, avisos y etiquetas de calendario. | scripts/app.js; scripts/ui.js |
| 1.4 · Escala tipográfica | Completada | Clases y tokens compartidos; metadatos caption y texto operativo legible. | styles/tokens.css; styles/components.css |
| 1.5 · Viewport accesible | Completada | Eliminadas restricciones de zoom. | index.html |
| 1.6 · Foco visible | Completada | Contorno global para controles y switches en ambos temas. | styles/base.css; styles/components.css |
| 1.7 · Movimiento reducido | Completada | Preferencia global; no depende de modo guantes. | styles/base.css |
| 1.8 · Breakpoints responsive | Completada | Móvil, tablet y pantalla amplia; formularios, métricas y calendario adaptados. | styles/layout.css; styles/components.css |
| 1.9 · Caché PWA | Completada | Versión nueva y precache de CSS, JavaScript e iconos; recarga offline probada. | sw.js |

## 2. Componentes core

| Tarea | Estado | Implementación | Archivos |
|---|---|---|---|
| 2.1 · Botones | Completada | Variantes coherentes y targets de 48/56 px. | styles/components.css |
| 2.2 · Botones de icono | Completada | Nombres accesibles y SVG decorativos fuera del árbol accesible. | index.html; scripts/ui.js |
| 2.3 · Accesos rápidos semánticos | Completada | Botones type=button conservando data-action/data-view. | scripts/app.js |
| 2.4 · Tarjetas | Completada | Variantes reutilizables y clases de presentación. | styles/components.css; scripts/app.js |
| 2.5 · Filas de lista | Completada | Helper común para filas navegables e informativas; resultados CIMA usan medRow. | scripts/app.js |
| 2.6 · Formularios | Completada | Etiquetas asociadas, grupos semánticos, ayuda de unidades y errores asociados. | scripts/app.js; scripts/ui.js; styles/components.css |
| 2.7 · Switches | Completada | Checkbox nativo con superficie clicable y foco visible. | styles/components.css |
| 2.8 · Feedback | Completada | Toast y carga accesibles, avisos y estados vacíos coherentes. | index.html; scripts/app.js; scripts/ui.js |
| 2.9 · Modal accesible | Completada | Semántica, fondo inerte, foco circular y Escape que cancela la confirmación. | index.html; scripts/ui.js |
| 2.10 · Slide-over accesible | Completada | Control de capas y recuperación del foco, incluido modal sobre panel. | index.html; scripts/ui.js |
| 2.11 · Estado de navegación | Completada | aria-current sincronizado con la ruta activa. | scripts/app.js; scripts/ui.js |
| 2.12 · Iconografía | Completada | SVG locales/inline para iconos operativos; sin CDN. | index.html; scripts/ui.js |

## 3. Vistas y flujos

| Tarea | Estado | Implementación | Archivos |
|---|---|---|---|
| 3.1 · Hoy contextual | Completada | Jornada actual, estado de prácticas, próximos pendientes y accesos limitados. | scripts/app.js |
| 3.2 · Acciones de prácticas | Completada | Nuevo caso y registro diario condicionados por periodo activo; estado previsto/finalizado. | scripts/app.js |
| 3.3 · Cuatro accesos rápidos | Completada | Máximo de cuatro acciones en Hoy. | scripts/app.js |
| 3.4 · Consulta | Completada | Agrupa CIMA, CIE-11, calculadoras, analíticas y diccionario; accesible desde Hoy y búsqueda. | scripts/ui.js; scripts/app.js |
| 3.5 · Onboarding | Completada | Privacidad, perfil y prácticas opcionales; sin campos ocultos que bloqueen validación. | scripts/app.js |
| 3.6 · Universidad neutral | Completada | Nombre libre con sugerencia UCV; preserva valor UCV y reglas existentes. | scripts/app.js |
| 3.7 · Prácticas | Completada | Agrupación de periodo/turno, portfolio/memoria y casos; histórico consultable. | scripts/app.js |
| 3.8 · Formulario de caso | Completada | Cuatro fieldsets: Turno, Situación clínica, Intervenciones y Aprendizaje. | scripts/app.js |
| 3.9 · Autocomplete | Completada | Combobox y listbox con flechas, Enter, Escape y toque; aborta/descarta respuestas antiguas. | scripts/app.js; scripts/ui.js |
| 3.10 · Batea | Completada | Buscador sticky, favoritas separadas y filtro de ambos grupos. | scripts/app.js; styles/components.css |
| 3.11 · CIMA | Completada | Jerarquía de riesgos y ficha offline; conserva indicaciones, incompatibilidades, conservación y manipulación disponibles. | scripts/app.js |
| 3.12 · Calculadoras | Completada | Unidades asociadas, resultado identificado y anunciado; fórmulas originales. | scripts/app.js; scripts/ui.js |
| 3.13 · Búsqueda global | Completada | Resultados agrupados, tres por categoría, foco inicial y sustitución de panel sin apilado. | scripts/app.js; scripts/ui.js |
| 3.14 · Estudio | Completada | CTA según tarjetas pendientes; crear primera tarjeta o mostrar repaso completado. | scripts/app.js |
| 3.15 · Métricas | Completada | Grid flexible con dos columnas en móvil y cuatro cuando caben. | styles/components.css |
| 3.16 · Títulos críticos | Completada | Wrapping de títulos de medicamentos, diagnósticos y técnicas. | styles/components.css |
| 3.17 · Tablet/iPad | Completada | Mismos controles redistribuidos en navegación lateral desde 900 px. | styles/layout.css |
| 3.18 · Topbar estrecha | Completada | Búsqueda/Ajustes visibles; Guantes/Solo lectura disponibles en Ajustes. | styles/layout.css; scripts/app.js |
| 3.19 · Estados vacíos | Completada | Acciones válidas en agenda, casos y estudio; formularios visibles evitan CTA duplicadas; solo lectura no permite escribir. | scripts/app.js; scripts/ui.js |
| 3.20 · Solo lectura | Completada | Campos y acciones de escritura bloqueados; formularios abiertos protegidos; consulta y exportación disponibles. | scripts/ui.js; scripts/app.js |
| 3.21 · Validación con teclado y lector | Parcial: falta lector real | Teclado, foco, nombre/rol/estado y auditoría automática ejecutados; pendiente lector de pantalla real. | scripts/ui.js; docs/VALIDATION.json |
| 3.22 · Cuatro tamaños | Completada | 320×568, 390×844, 768×1024 y 1366×768 en Chromium, modos normal/guantes; shell y formularios representativos. | styles/*.css; docs/VALIDATION.json |
| 3.23 · Limpieza inline | Completada | Solo queda ancho porcentual de progreso derivado del estado; resto en clases reutilizables. | scripts/app.js; styles/components.css |
| 3.24 · Documentación | Completada | README real, contrato UI, estado individual y resultados de pruebas. | README.md; docs/*.md; docs/VALIDATION.json |

## Adaptaciones técnicas

- Se separa también el JavaScript de index.html para reducir el tamaño del documento; se conserva la aplicación vanilla y no se requiere build.
- El calendario usa desplazamiento horizontal interno y región accesible cuando siete controles de 48/56 px no caben. No hay scroll horizontal de toda la página.
- En modo solo lectura algunas acciones se deshabilitan en vez de desaparecer para mantener orientación y contenido consultable.
- Se permite introducir universidad libremente; no se convierte en dato obligatorio.
- Los estilos anteriores se convierten en utilidades composables con nombres descriptivos y variantes de componentes.
- El ZIP incluye una implementación de frontend; el Worker no existía en la copia original y no se ha creado un backend nuevo.
