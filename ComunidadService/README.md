# ComunidadService

API FastAPI/PostgreSQL de reseñas, con validación JWT y moderación auditada.
Frontend asociado: FrontService/src/app/FrontComunidad/.

| Función | API | Pantalla |
| --- | --- | --- |
| Consultar reseñas y resumen | GET /api/v1/resenas?curso_id=1 | Reseñas del curso, público |
| Publicar reseña | POST /api/v1/resenas | Formulario de alumno |
| Ocultar reseña con motivo | PATCH /api/v1/resenas/{id}/ocultar | Acción del administrador en la tarjeta |
| Comprobar identidad | GET /api/v1/sesion | Sesión compartida de FrontService |
| Estado y conexión | GET /health y GET /health/db | Documentación /docs |

## Arranque desde cero con Docker

Desde ComunidadService, copiar .env.example a .env solo si aún no tienes .env y
cambiar COMUNIDAD_DB_PASSWORD. Docker no necesita PostgreSQL instalado en Windows.

```powershell
docker compose build comunidadservice
docker compose up -d comunidad-db
docker compose run --rm comunidadservice python -m alembic upgrade head
docker compose --profile herramientas run --rm --no-deps sesiones-prueba
docker compose --profile front up -d --build
```

Abrir http://localhost:4200 y seguir la [guía de reseñas](docs/RESENAS.md) para
cargar las sesiones de prueba. API y Swagger: http://localhost:8001/docs.
Si ya tenías la base funcionando, conservar .env y el volumen; usar la misma guía
para actualizar desde la rama feat/comunidad-resenas.

La herramienta de laboratorio permite probar el alumno y el administrador con
JWT firmados localmente. No reemplaza el inicio de sesión real de UsuarioService.
La configuración del emisor y su clave pública está documentada en
[el contrato de ComunidadService](../docs/contratos/ComunidadService.md).

## Ejecución Python opcional

Requiere Python 3.11 o superior. Desde ComunidadService:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

Para esta opción configurar en .env el PostgreSQL real al que se conectará Python.
El .env se lee desde la carpeta del servicio, no desde la terminal actual.

## Pruebas

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check app tests migrations scripts
.\.venv\Scripts\python.exe -m pip check
```

Las pruebas usan SQLite aislado y JWT de prueba; no alteran bases del desarrollador.
La comprobación real de PostgreSQL debe realizarse levantando el compose.

## Organización

- app/core: configuración y verificación JWT/roles.
- app/models: resenas y moderaciones_resenas.
- app/schemas: validación estricta y respuestas públicas.
- app/services: listado, publicación y ocultamiento transaccional.
- app/routers: salud, sesión y reseñas.
- app/database: motor, sesiones y metadatos de migraciones.
- migrations/versions: migraciones reales de las tablas.
- scripts: herramienta local de sesiones, sin endpoint de autenticación ficticia.
- tests: permisos, datos, errores, persistencia y migraciones.

Pendientes: puntos/logros, eventos de ProgresoService y conexión definitiva con
UsuarioService, Catálogo y las reglas acordadas de elegibilidad para reseñar.
