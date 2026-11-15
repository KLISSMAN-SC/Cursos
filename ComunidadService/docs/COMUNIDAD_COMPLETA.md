# Continuación de ComunidadService

feat/comunidad-completa parte de feat/comunidad-resenas (6844a1a). Conserva FastAPI,
PostgreSQL, JWT RS256 y el Angular compartido. Completa edición propia, reseña
activa única, consulta REST de derechos, historial administrativo y gamificación.

## Correspondencia con el informe

| Regla o caso | Implementación |
| --- | --- |
| RN10 / CU06 | Una reseña activa por alumno/curso, nota 1..5, comentario opcional y derecho ACTIVO |
| CA09 | Solo el autor estudiante edita; el administrador oculta con motivo |
| RN12 / CU09 | Sin borrado; identidad JWT, fecha y motivo; auditoría protegida en PostgreSQL |
| RN11 / CU_Consume / CA07 | Una insignia y 10 puntos por módulo/versión; deduplicación por evento y por hito |
| CU07 | Mis logros con totales, paginación y estado vacío |
| Aislamiento | Base propia, REST para derechos y AMQP para eventos; sin JOIN entre servicios |

La tabla del informe «Requisitos Funcionales - Dominio Comunidad» repite RF09–RF12
de Progreso. Se implementan las reglas RN10–RN12, los casos de uso y CA07/CA09 del
mismo informe. Corregir esa tabla para que coincida con su matriz RF13–RF16.

## Actualizar conservando la base

Una vez publicada la rama en GitHub, guardar los cambios locales y ejecutar desde
la raíz de Cursos:

```powershell
git fetch origin
git switch feat/comunidad-completa
git pull --ff-only origin feat/comunidad-completa
cd ComunidadService
```

Conserva tu .env y volumen actuales. Solo para una instalación nueva:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Configura COMUNIDAD_DB_PASSWORD. Si ya tenías PostgreSQL, conserva la contraseña:
cambiar .env no cambia la clave de un rol dentro de un volumen existente. Ante
«password authentication failed», verifica usuario, base y clave originales. Desde
una sesión administrativa válida puedes cambiarla con \password en psql y después
actualizar .env. No es necesario eliminar el volumen.

### Duplicados anteriores

La versión anterior permitía varias reseñas por alumno/curso. La migración nueva
se detiene sin borrar/ocultar datos si encuentra más de una visible por par. Para
identificarlas en PostgreSQL:

```sql
SELECT estudiante_id, curso_id, array_agg(id ORDER BY id DESC) AS resenas
FROM resenas WHERE oculta = false
GROUP BY estudiante_id, curso_id HAVING count(*) > 1;
```

Si hay duplicados, usa la API/pantalla anterior como ADMIN y oculta las sobrantes
con motivo, conservando una visible por par. Si ya cambiaste de rama, vuelve
temporalmente a feat/comunidad-resenas e inicia su API/pantalla; regresa después a
feat/comunidad-completa, reconstruye y repite la migración. Así registra al admin
real, sin inventar una identidad en una migración. No ejecutar down -v al actualizar.

## Demostración independiente con Docker

Catálogo, Usuarios y Progreso todavía no están implementados en el repositorio.
compose.demo.yaml habilita explícitamente un doble de Catálogo: solo alumno 1 y
curso 1 tienen derecho ACTIVO. No procesa pagos ni sustituye al servicio del equipo.

Desde ComunidadService:

```powershell
docker compose build comunidadservice
docker compose up -d comunidad-db
docker compose run --rm comunidadservice python -m alembic upgrade head
docker compose --profile herramientas run --rm --no-deps sesiones-prueba
docker compose -f compose.yaml -f compose.demo.yaml --profile eventos --profile front up -d --build
```

Abrir http://localhost:4200. Swagger http://localhost:8001/docs. RabbitMQ:
http://localhost:15672 con usuario/clave de .env. El consumidor corre en
comunidad-worker, separado de la API.

### Recorrido para exponer

1. Visitante: /comunidad/cursos/1 muestra reseñas y resumen público.
2. En «Sesión de prueba», cargar .local-auth/sesiones.json y entrar como estudiante.
   Publicar nota y comentario opcional.
3. «Editar mi reseña» cambia la nota y el promedio sin crear otra activa. El curso 2
   deniega publicar: el doble de Catálogo no concede ese derecho.
4. Cambiar a administrador, abrir «Moderación», ocultar con motivo y filtrar
   «Ocultas»: revisar texto original, motivo, administrador y fecha.
5. Volver a visitante: la oculta no aparece ni afecta el promedio.
6. Volver al estudiante y entrar a «Mis logros». Sin premios, muestra cero.
   Publicar un evento de laboratorio:

```powershell
docker compose --profile herramientas run --rm --no-deps publicar-modulo
```

El comando publica dos veces el mismo evento para alumno 1/curso 1/versión 1/
módulo 1. Pulsar «Actualizar»: una insignia y 10 puntos por ese hito, aunque repitas
el comando con otro evento. Para un módulo distinto:

```powershell
docker compose --profile herramientas run --rm --no-deps publicar-modulo python -m scripts.publicar_modulo --modulo 2 --repetir 2
```

Si esos eran los únicos hitos premiados, ahora son dos insignias y 20 puntos.
Las insignias son gamificación del avance declarado, no certificados académicos.
Para revisar el consumidor:

```powershell
docker compose --profile eventos logs --tail=80 comunidad-worker
```

## Integración con los compañeros

Ver [contratos completos](../../docs/contratos/ComunidadService.md).

- UsuarioService aporta claims acordados y clave pública en
  config/jwt/usuarios-public.pem. Su login conecta con Session de core/auth.
- Catálogo implementa GET /api/v1/derechos. Configura URL y credencial en
  COMUNIDAD_CATALOGO_BASE_URL y COMUNIDAD_CATALOGO_SERVICE_TOKEN; enlaza desde el
  curso a /comunidad/cursos/:cursoId. Sin configurar, crear/editar devuelve 503.
- Progreso emite ModuloCompletado con versión, módulo, alumno, UUID estable y fecha
  con zona horaria, utilizando su outbox y exchange/routing key acordados.
- RabbitMQ usa COMUNIDAD_RABBITMQ_HOST, PORT, USER, PASSWORD y VHOST. El compose usa
  el host interno comunidad-rabbitmq y vhost /.

Para salir de la demostración, configura el Catálogo real en .env y recrea la API
usando solo compose.yaml. El doble no se inicia con el compose normal. Los ajustes
de eventos (nombres, reintentos, demora) se pueden pasar al worker mediante las
variables COMUNIDAD_EVENT_* definidas en Settings.

## Pruebas

Python 3.11+ y Node 24. Desde ComunidadService:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check app tests migrations scripts
.\.venv\Scripts\python.exe -m pip check
cd ../FrontService
npm ci
npm test -- --watch=false
npm run build
npm run build:local
```

Por defecto, SQLite y JWT de pruebas no tocan la base del desarrollador. Dos pruebas
adicionales usan COMUNIDAD_TEST_POSTGRES_URL hacia una base de pruebas y crean/
eliminan solo esquemas aleatorios propios. Dos pruebas AMQP necesitan
COMUNIDAD_TEST_RABBITMQ_HOST, USER y PASSWORD; usan colas/exchange aleatorios propios
para comprobar reentrega, DLQ y retorno desde retry.

El workflow .github/workflows/comunidad.yml prepara PostgreSQL 17 y RabbitMQ 4.3,
ejecuta esas integraciones, Ruff, pip check, Angular y ambos builds. No se considera
aprobado hasta ver su resultado tras publicar el cambio o abrir el PR.

Verificación en el entorno de preparación: 81 pruebas Python locales y 27 Angular
correctas; dos pruebas adicionales de concurrencia/migraciones y auditoría inmutable
con PostgreSQL 16.2 real; ambos builds correctos. También pasó un flujo HTTP real a
través del proxy Angular: JWT, validación REST de derechos, reseña única, edición,
moderación y consulta de una recompensa única. El compose usa PostgreSQL 17. RabbitMQ real y Docker deben
verificarse con compose o CI; aquí no hay daemon Docker. La inspección visual en
Chromium no se pudo realizar por las restricciones de sockets del entorno.

## Integración a main

El PR de feat/comunidad-completa contra main incluye también los avances anteriores
de feat/comunidad-resenas: main sigue en la estructura inicial. Revisar rutas/menú
compartidos con el equipo y comprobar el workflow antes de fusionar. No hace falta
un frontend separado ni acceder a bases de otros servicios.

Si recibiste esta entrega como archivos, consulta
[cómo importar la rama conservando su historial](../../docs/IMPORTAR_RAMA_COMUNIDAD.md).
