# Contrato de ComunidadService: reseñas

Confirmado: JWT y IDs enteros. El detalle criptográfico siguiente es una propuesta
implementada para probar independientemente; acordarlo con UsuarioService antes
de integrar su inicio de sesión real.

## Identidad

JWT firmado con RS256. ComunidadService solo necesita la clave pública.

| Claim | Formato esperado |
| --- | --- |
| sub | Cadena decimal del ID entero positivo del usuario, por ejemplo "7" |
| rol | ESTUDIANTE o ADMIN |
| iss | Emisor configurado por COMUNIDAD_JWT_ISSUER; propuesta UsuarioService |
| aud | Audiencia configurada por COMUNIDAD_JWT_AUDIENCE; propuesta ComunidadService |
| exp | Expiración JWT obligatoria |

Se verifica firma, algoritmo fijo, emisor, audiencia y expiración. sub es una
cadena según JWT; los IDs de las solicitudes/respuestas JSON son números enteros.
No se reciben estudiante_id, administrador_id ni rol en los cuerpos de mutación.
No se acepta X-Student-Id o X-Admin-Id como autenticación. Los IDs externos se
limitan a 1..9007199254740991 para conservar su precisión en JavaScript.

## API

Base directa: /api/v1. Proxy del frontend: /api/comunidad/api/v1.

| Método y ruta | Permiso | Resultado |
| --- | --- | --- |
| GET /sesion | JWT válido | id y rol verificados |
| GET /resenas?curso_id=1&limit=6&offset=0 | Público | items, total, limit, offset y resumen |
| POST /resenas | ESTUDIANTE | 201, reseña creada |
| PATCH /resenas/{id}/ocultar | ADMIN | Auditoría del ocultamiento |

Crear reseña:

```json
{"curso_id":1,"calificacion":5,"comentario":"Me resultó útil"}
```

calificacion es un entero de 1 a 5. comentario es opcional, se recorta y admite
hasta 2000 caracteres; el texto vacío se guarda como null. Los campos adicionales
se rechazan. La identidad se deriva exclusivamente del JWT.

Ocultar:

```json
{"motivo":"Contenido ofensivo"}
```

Motivo obligatorio, recortado, de 1 a 1000 caracteres. El cambio y la auditoría se
confirman en una misma transacción. Repetirlo devuelve 409 y no duplica auditoría.
No existe eliminación física ni restauración en esta entrega.

La consulta pública siempre excluye ocultas y calcula media, distribución y total
sobre esas mismas filas visibles. Orden: ID descendente. limit: 1..100; offset >=0.
Sin reseñas, promedio es null. La media se redondea a un decimal.

| Error | Significado |
| --- | --- |
| 401 | Token ausente, alterado, expirado o con claims inválidos |
| 403 | Rol sin permiso para la operación |
| 404 | Reseña a ocultar inexistente |
| 409 | Reseña ya ocultada |
| 422 | Datos o paginación inválidos |
| 503 | Autenticación sin configurar o base de datos no disponible |

## Integración pendiente

CatalogoService debe aportar el curso y su ID. Acordar si reseñar exige curso
existente, compra, matrícula o avance; todavía no hay un endpoint implementado de
Catálogo/Pagos que permita verificar esas condiciones. Tampoco se ha acordado una
única reseña por alumno. No dar por aprobadas esas reglas con el modo de pruebas.

UsuarioService debe confirmar los claims y entregar la clave pública, no la
privada. FrontUsuarios conectará el login real con core/auth y las rutas compartidas.
ProgresoService aún no aporta eventos de logros; no forman parte de esta entrega.
