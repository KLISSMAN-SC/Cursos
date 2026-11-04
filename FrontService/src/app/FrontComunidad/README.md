# FrontComunidad

Reseñas implementadas en pages/resenas. La moderación vive en el componente de
cada tarjeta, dentro de components; no hace falta una pantalla administrativa
separada para ocultar un comentario.

- components/rating-summary: media y distribución de reseñas visibles.
- components/review-card: comentario, fecha y controles del administrador.
- pages/resenas: listado, formulario, carga, errores y paginación.
- services/community-api: contratos HTTP de ComunidadService.
- models/review: tipos usados por la pantalla.

Ruta: /comunidad/cursos/:cursoId, con ID entero positivo. El título del curso puede
llegar por ?titulo=Nombre como presentación, sin cambiar la referencia usada por
la API. Hasta conectar Catálogo se usa Curso #ID.

El alumno ve el formulario; el administrador ve moderación; el visitante puede
leer. El backend valida los permisos en todas las mutaciones. Ocultar exige motivo,
retira la reseña de la consulta pública y actualiza el resumen al recargar.

Las páginas de logros y su API se implementarán en la siguiente etapa.
