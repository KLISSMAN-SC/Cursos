# Contratos de ComunidadService

Comunidad posee las tablas de reseñas, moderaciones, recompensas y eventos
procesados. No consulta las bases de otros servicios. Implementa RN10–RN12,
CU06, CU07, CU09 y CU_Consume del informe de AulaBreve.

Los otros backends todavía son estructuras vacías. Los contratos siguientes están
implementados del lado de Comunidad y deben acordarse con sus responsables.

## Identidad de UsuarioService

JWT RS256; Comunidad recibe solo la clave pública.

| Claim | Formato |
| --- | --- |
| sub | ID positivo como cadena decimal, por ejemplo "7" |
| rol | ESTUDIANTE o ADMIN |
| iss | COMUNIDAD_JWT_ISSUER; predeterminado UsuarioService |
| aud | COMUNIDAD_JWT_AUDIENCE; predeterminado ComunidadService |
| exp | Expiración obligatoria |

Se verifican firma, algoritmo fijo, emisor, audiencia y expiración. IDs JSON:
enteros de 1 a 9007199254740991. La identidad de las mutaciones sale del JWT;
no se admite estudiante_id, administrador_id o rol en sus cuerpos ni headers
editables. La herramienta local no crea usuarios reales y su pantalla no se
registra en el build production.

## API de Comunidad

Base directa: /api/v1. Proxy Angular/Nginx: /api/comunidad/api/v1.

| Método y ruta | Permiso | Resultado |
| --- | --- | --- |
| GET /sesion | JWT válido | Identidad verificada |
| GET /resenas?curso_id=1&limit=6&offset=0 | Público | Página y resumen de visibles |
| GET /resenas/mia?curso_id=1 | ESTUDIANTE | Activa propia; última oculta si no hay activa; null si no existe |
| POST /resenas | ESTUDIANTE con acceso vigente | 201; una activa por estudiante/curso |
| PATCH /resenas/{id} | Autor ESTUDIANTE con acceso vigente | Edición de calificación y comentario |
| PATCH /resenas/{id}/ocultar | ADMIN | Auditoría y ocultamiento atómicos |
| GET /admin/resenas?estado=todas | ADMIN | Visibles y ocultas con auditoría |
| GET /mis-logros?limit=12&offset=0 | ESTUDIANTE | Sus insignias, total y puntos |

Publicación:

```json
{"curso_id":1,"calificacion":5,"comentario":"Aprendí bastante"}
```

Edición, sin poder cambiar el curso o el autor:

```json
{"calificacion":4,"comentario":"Actualicé mi experiencia"}
```

Calificación: entero estricto 1..5. Comentario opcional, recortado y de hasta 2000
caracteres; vacío se guarda como null. Se rechazan campos adicionales. Una reseña
oculta no se edita ni restaura; la regla de una activa permite publicar otra
conservando el registro anterior y su auditoría.

Ocultamiento:

```json
{"motivo":"Contenido ofensivo"}
```

Motivo obligatorio de 1..1000 caracteres tras recortar. Repetirlo devuelve 409 sin
duplicar auditoría. Un trigger PostgreSQL rechaza UPDATE y DELETE de las
moderaciones. No existe eliminación física en la API.

El listado público y el resumen excluyen ocultas. Promedio sobre las mismas filas
visibles, redondeado a un decimal; null si no hay reseñas. Orden: ID descendente.
limit 1..100, offset >=0. Administración admite curso_id opcional y estado
todas/visibles/ocultas. Mis logros admite curso_id opcional; sus totales se calculan
sobre todo el filtro, no solo la página. La moderación no modifica puntos.

| HTTP | Significado |
| --- | --- |
| 401 | Sesión ausente o inválida |
| 403 | Rol incorrecto, reseña ajena o derecho no activo |
| 404 | Reseña inexistente |
| 409 | Reseña activa duplicada, oculta o cambio concurrente |
| 422 | Datos, IDs, estado o paginación inválidos |
| 503 | Base, autenticación o Catálogo no disponibles/configurados |

## Consulta de derechos a Catálogo

Configurar COMUNIDAD_CATALOGO_BASE_URL y COMUNIDAD_CATALOGO_SERVICE_TOKEN. Se envía
una credencial de servicio; no se reenvía el JWT del alumno a una audiencia ajena.

```http
GET /api/v1/derechos?estudiante_id=7&curso_id=1
Authorization: Bearer <credencial-del-servicio>
```

Respuesta 200:

```json
{"estudiante_id":7,"curso_id":1,"estado":"ACTIVO"}
```

Estados ACTIVO/PENDIENTE/REVOCADO/INEXISTENTE; solo ACTIVO autoriza crear/editar.
Los IDs deben coincidir exactamente. Un 404 se interpreta como ausencia de derecho
(403). Timeout, respuesta inválida, identidad distinta, error de credencial o
configuración ausente devuelven 503, sin conceder acceso por defecto. Timeout
configurable 1..15 s. La lectura pública no verifica existencia/nombre del curso;
el enlace desde Catálogo aporta el ID y ?titulo=Nombre opcional para presentación.

## Evento de ProgresoService

AMQP 0-9-1 / RabbitMQ. Configuración predeterminada:

| Elemento | Valor |
| --- | --- |
| Exchange topic durable | cursos.eventos |
| Routing key | progreso.modulo_completado.v1 |
| Cola durable quorum | comunidad.modulos |
| Reintentos diferidos | comunidad.modulos.retry |
| Mensajes fallidos | comunidad.modulos.dlq |

Payload UTF-8 application/json, máximo 65536 bytes:

```json
{
  "evento_id":"bfbd2577-38a7-45c4-8b81-6014be6f91cc",
  "tipo":"ModuloCompletado",
  "estudiante_id":7,
  "curso_id":1,
  "version_curso":1,
  "modulo_id":2,
  "completado_en":"2026-11-14T18:00:00Z"
}
```

evento_id es UUID estable, IDs/versiones enteros positivos y fecha con zona
horaria. No se admiten puntos, insignias o reglas elegidos por el productor. Cada
usuario + curso + versión + módulo + regla modulo_completado_v1 recibe una insignia
y exactamente 10 puntos una sola vez.

Progreso publica solo tras completar el 100% del módulo de la versión adquirida.
Debe guardar el evento con el avance en su outbox y publicarlo persistente, con
mandatory y publisher confirms; conserva evento_id y payload al reintentar.
Comunidad no reemplaza su outbox ni recalcula el avance académico.

El consumidor confirma ACK después del commit local de evento y recompensa.
Repetir el mismo ID/contenido o usar otro ID para el mismo hito no duplica puntos.
Reutilizar ID con otro contenido va a DLQ. No hay API pública para otorgar premios.

Errores temporales: tres reintentos diferidos (10 s por defecto), luego DLQ.
Errores de esquema/conflicto: DLQ directa. Se confirma el reenvío persistente antes
del ACK original; si falla, no se confirma el original. Colas quorum con estrategia
de dead lettering at-least-once conservan mensajes al volver desde retry. Solo el
worker depende del broker, no las consultas de la API.

Revisar la causa de una DLQ antes de republicar el payload original al exchange y
routing key acordados. No purgar ni cambiar ID para resolver conflictos sin
coordinar con Progreso. En producción, limitar permisos del productor a publicar y
del consumidor a sus colas; las credenciales AMQP nunca llegan al navegador.
