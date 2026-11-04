# ComunidadService

Nombre del servicio: ComunidadService. Frontend asociado:
FrontService/src/app/FrontComunidad/. Propuesta de backend: Python y FastAPI.

Este es el esqueleto inicial; todavía no existe app/main.py, requirements.txt,
configuración de Alembic ni una aplicación que pueda ejecutarse.

| Carpeta | Contenido |
| --- | --- |
| app/core | Configuración, validación de identidad y permisos |
| app/database | Conexión y sesión de la base de datos propia |
| app/models | Entidades persistidas por ComunidadService |
| app/schemas | Validación de entradas y contratos de salida |
| app/routers | Endpoints HTTP: reseñas, moderación, logros y salud |
| app/services | Reglas de negocio y coordinación de operaciones |
| app/clients | Clientes de APIs externas, si los contratos los requieren |
| app/events | Consumidores y manejo de eventos, si se acuerda mensajería |
| migrations/versions | Migraciones reales al configurar Alembic |
| tests/unit | Pruebas de reglas y permisos |
| tests/integration | Pruebas de API, persistencia e integraciones |
| docs | Decisiones y documentación propia del servicio |

## Alcance inicial a confirmar

- Consultar las reseñas visibles de un curso.
- Publicar una reseña con calificación y comentario como alumno autenticado.
- Ocultar una reseña como administrador indicando un motivo, con auditoría.
- Consultar puntos y logros del alumno autenticado.
- Procesar los hitos de ProgresoService sin otorgar dos veces el mismo premio.

La matriz raíz vincula estos requerimientos con sus pantallas. La implementación
incluye errores y permisos; ocultar un botón no sustituye la autorización del API.

El alumno y el administrador se identifican mediante la autenticación que se
acuerde con UsuarioService. No usar un ID editable del navegador como prueba de
identidad o rol. Los tipos de IDs de curso, alumno y módulo, así como la entrega
de eventos, se definirán con el equipo antes de implementar los clientes.

Al comenzar a programar: agregar app/main.py, dependencias, configuración de
migraciones, .env.example y Dockerfile, y documentar los comandos reales aquí.
