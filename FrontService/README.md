# FrontService

Una aplicación Angular para todo el equipo. Cada integrante es responsable de su
área funcional y de conectar sus pantallas con el backend correspondiente.

| Ubicación | Uso |
| --- | --- |
| src/app/core/auth | Sesión compartida y acceso a la identidad del usuario |
| src/app/core/guards | Restricción de navegación por sesión y rol |
| src/app/core/http | Configuración HTTP común e interceptores, si se necesitan |
| src/app/layout | Cabecera, menú y estructura de la aplicación |
| src/app/shared/components | Botones, estados vacíos y otros elementos comunes |
| src/app/shared/models | Tipos realmente compartidos; no todos los modelos del proyecto |
| src/app/FrontUsuarios | Ingreso, registro, cuenta y gestión de usuarios |
| src/app/FrontCatalogo | Catálogo, detalle y gestión del contenido de cursos |
| src/app/FrontPagos | Compra, simulador y consulta de compras |
| src/app/FrontProgreso | Aprendizaje y seguimiento del avance |
| src/app/FrontComunidad | Reseñas, logros y moderación de comentarios |
| public/assets | Imágenes e iconos estáticos |
| docs | Convenciones visuales y decisiones del frontend |

Dentro de cada área: pages, components, services y models. Mantener archivos y
componentes pequeños con responsabilidades claras. Las pruebas de componentes y
servicios se ubicarán junto al código correspondiente, con el sufijo .spec.ts.

No hay package.json ni angular.json todavía. Son carpetas preparadas, no una
aplicación instalable. Al inicializar Angular se mantendrán estas áreas y se
crearán una sola vez los archivos centrales del workspace. El equipo debe fijar
la versión de Angular y Node y la biblioteca visual antes de instalar dependencias.

Las rutas globales, app.config.ts, estilos generales, package.json y su lockfile
son compartidos. Coordinar sus cambios. Cada área puede exponer su archivo de
rutas para cargarlo desde la navegación principal al implementarla.

Mostrar u ocultar controles según el rol mejora la experiencia; cada backend
valida por separado la autorización de la operación. Los servicios de área deben
usar contratos acordados y configuración de URLs, sin credenciales en el código.
