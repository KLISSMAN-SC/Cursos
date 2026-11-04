# ComunidadService — base inicial

Backend Python/FastAPI de ComunidadService. Esta entrega inicia el proyecto nuevo:
arranque, configuración, conexión PostgreSQL, salud, Docker y base de migraciones.
Las reseñas, moderación y logros siguen pendientes de implementación junto a sus
pantallas de FrontService/src/app/FrontComunidad/. No se implementan identidades
ficticias ni se asumen contratos todavía no acordados con los compañeros.

## Arranque recomendado con Docker Desktop

Desde la carpeta local del repositorio Cursos, en PowerShell:

```powershell
cd ComunidadService
Copy-Item .env.example .env
```

Este segundo comando es para la primera vez; no vuelvas a copiarlo sobre un .env
ya configurado. Abre .env y cambia COMUNIDAD_DB_PASSWORD. Luego ejecuta:

```powershell
docker compose up -d --build
docker compose ps
```

Abre estas direcciones:

- http://localhost:8001/health — el proceso responde.
- http://localhost:8001/health/db — consulta SQL real a PostgreSQL.
- http://localhost:8001/docs — documentación interactiva.

Respuesta de /health:

```json
{"status":"ok","service":"ComunidadService","version":"0.1.0"}
```

Respuesta de /health/db cuando está conectado:

```json
{"status":"ok","service":"ComunidadService","version":"0.1.0","database":"comunidad_db"}
```

Si /health responde y /health/db devuelve 503, el proceso funciona pero la base
no está configurada o no responde. No se devuelve un estado de conexión ficticio.
Para revisar el error:

```powershell
docker compose logs --tail 80 comunidadservice comunidad-db
```

Este compose es específico de ComunidadService, con un volumen de datos propio.
No publica el puerto 5432 en Windows; no requiere instalar PostgreSQL localmente.
El backend usa 8001 para no ocupar el 8000 del proyecto anterior. COMUNIDAD_PORT en
.env permite cambiarlo. El compose general del equipo sigue pendiente.

PostgreSQL conserva usuario y contraseña en el volumen al inicializarlo; cambiar
.env después no cambia automáticamente las credenciales de una base existente.

Para detener el entorno conservando los datos:

```powershell
docker compose down
```

## Ejecución local opcional con Python

Requiere Python 3.11 o superior y PostgreSQL disponible. Si usas Python directamente,
configura en .env el host, puerto, nombre, usuario y clave de tu PostgreSQL real.
No ejecutes a la vez Uvicorn y Docker usando el mismo puerto del backend.

Desde ComunidadService:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

No es necesario activar el entorno virtual ni cambiar la política de PowerShell.
El .env se lee respecto a la carpeta del servicio, no al directorio actual de la terminal.

## Pruebas y formato

En un entorno Python con requirements-dev.txt instalado:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check app tests migrations
.\.venv\Scripts\python.exe -m pip check
```

Las pruebas no necesitan PostgreSQL ni modifican bases locales: usan dobles de
prueba y un motor SQLite en memoria para verificar la ruta SQL. La prueba real de
PostgreSQL consiste en arrancar el compose y comprobar /health/db; debe hacerse
en un entorno con Docker. No se confunden ambas comprobaciones.

## Migraciones

Alembic queda configurado, sin revisiones ni tablas de negocio todavía. No se
llama create_all ni se cambia el esquema automáticamente al iniciar el backend.
Se creará la primera migración al implementar los modelos de reseñas.

## Organización

- app/main.py: aplicación y arranque/cierre.
- app/core/config.py: variables de entorno y nombre ComunidadService.
- app/database/: motor, sesiones y metadatos.
- app/routers/health.py: estado y comprobación de conexión.
- app/schemas/health.py: contratos de respuesta.
- app/models/, app/services/, app/clients/, app/events/: listas para el desarrollo.
- migrations/: configuración de Alembic y revisiones futuras.
- tests/: configuración y pruebas de la base.

## Próxima funcionalidad

Reseñas por curso, con validación y permisos reales, acompañadas de su pantalla.
Antes de integrarla hay que confirmar con UsuarioService el mecanismo de identidad
y los roles, y con CatalogoService los identificadores y reglas para reseñar.
No usar X-Student-Id o X-Admin-Id editables como autenticación real.

Referencias de implementación: [configuración FastAPI](https://fastapi.tiangolo.com/advanced/settings/)
y [contenedores FastAPI](https://fastapi.tiangolo.com/deployment/docker/).
