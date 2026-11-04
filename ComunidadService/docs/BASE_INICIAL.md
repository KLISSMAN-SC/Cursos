# Base inicial de ComunidadService

Esta entrega prepara la infraestructura técnica del servicio. No implementa
reseñas, moderación ni premios todavía. Tampoco inicializa Angular ni cambia
las carpetas de los compañeros. La siguiente entrega debe enlazar una función
de negocio con su pantalla de FrontComunidad.

## Hecho

- Aplicación FastAPI con el nombre ComunidadService.
- Configuración externa y contraseña protegida en representaciones de objetos.
- Conexión PostgreSQL mediante SQLAlchemy/psycopg.
- GET /health y GET /health/db con estados diferentes y documentación Swagger.
- Base de Alembic sin tablas ni revisiones ficticias.
- Dockerfile y compose propio, PostgreSQL y volumen independientes.
- Pruebas de HTTP, configuración, CORS, errores y camino SQL en memoria.

## Validación de esta entrega

Pruebas Python correctas, Ruff correcto y pip check sin dependencias rotas.
También se arrancó Uvicorn en un proceso real y se verificaron /health y
el 503 de /health/db sin base configurada. El YAML de Compose se pudo leer
y se comprobaron sus servicios y dependencia de salud.

No hay Docker ni PostgreSQL disponibles en el entorno de preparación. No se ha
construido ni arrancado la imagen, ni se ha probado el driver contra PostgreSQL
real. La verificación del equipo es arrancar el compose y obtener 200 de
/health/db, con database igual a comunidad_db.

## Antes de la primera integración

Acordar con UsuarioService la autenticación, los roles y el contrato de identidad.
Acordar con CatalogoService los identificadores de curso y requisitos para reseñar.
Acordar con ProgresoService el hito de módulo completado y cómo evitar duplicados.
No se debe inventar un ID o enviar un rol editable desde el navegador para
suplir estos acuerdos.
