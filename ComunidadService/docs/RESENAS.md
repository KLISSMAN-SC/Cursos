# Reseñas y moderación de ComunidadService

Esta entrega permite consultar, publicar y ocultar reseñas desde FrontComunidad.
Los puntos, insignias y eventos de ProgresoService quedan para la siguiente etapa.

## Actualizar desde la base que ya funciona

Desde la raíz de Cursos, con tus cambios guardados:

```powershell
git fetch origin
git switch feat/comunidad-resenas
git pull --ff-only origin feat/comunidad-resenas
cd ComunidadService
```

Conserva tu .env actual y la contraseña de PostgreSQL. No lo reemplaces por el
.env.example nuevo. Los valores predeterminados de JWT sirven para la prueba local.

```powershell
docker compose build comunidadservice
docker compose up -d comunidad-db
docker compose run --rm comunidadservice python -m alembic upgrade head
docker compose --profile herramientas run --rm --no-deps sesiones-prueba
docker compose --profile front up -d --build
```

La migración crea resenas y moderaciones_resenas en la base propia del servicio.
No se crean tablas al arrancar la API. No ejecutar down -v para actualizar: los
datos del volumen deben conservarse.

## Probar las pantallas

1. Abrir http://localhost:4200/comunidad/cursos/1. Como visitante se ven las
   reseñas visibles, su media y distribución, pero no controles administrativos.
2. Abrir «Sesión de prueba» en la cabecera. Seleccionar el archivo local
   ComunidadService/.local-auth/sesiones.json generado por la herramienta.
3. Elegir «Entrar como estudiante». Se valida el JWT en el backend. Publicar una
   calificación de 1 a 5, con comentario opcional. El listado y el resumen se recargan.
4. Salir y cargar el mismo archivo, eligiendo «Entrar como administrador».
5. En una tarjeta, usar «Ocultar reseña», escribir un motivo y confirmar.
   La reseña ya no debe aparecer y el promedio/conteo deben actualizarse.
6. Salir para comprobar que un visitante tampoco ve la reseña ocultada.

También se puede probar en http://localhost:8001/docs usando Authorize y uno de
los JWT del archivo local. Los tokens duran ocho horas; repetir el comando de la
herramienta para renovarlos con la misma clave.

## Qué significa la sesión de prueba

La herramienta genera una clave RSA y dos JWT de laboratorio para IDs 1 y 2,
roles ESTUDIANTE y ADMIN. No crea cuentas reales en UsuarioService y no ofrece un
endpoint público que permita escoger un rol. La clave privada y los JWT se guardan
en .local-auth/, excluida de Git, del build y del contenedor que sirve la API.
Solo se monta la carpeta de clave pública en el backend, como solo lectura.

La pantalla de carga de sesiones está habilitada en el build local usado por este
compose. La configuración production no registra esa ruta ni muestra sus enlaces.
El Dockerfile del frontend usa production por defecto; el compose local elige local
explícitamente. El API siempre verifica la firma y permisos, cualquiera sea el build.

## Conectar UsuarioService real

Por ahora no existe su implementación en el repositorio. JWT e IDs enteros fueron
confirmados; el detalle RS256, nombres de claims, emisor y audiencia se propone
en docs/contratos/ComunidadService.md y debe acordarse con su responsable.

Al integrar, proporcionar la clave pública real en config/jwt/usuarios-public.pem
y los valores COMUNIDAD_JWT_ISSUER y COMUNIDAD_JWT_AUDIENCE correspondientes.
No copiar la clave privada de UsuarioService. La herramienta local se niega a
sobrescribir una clave pública ajena. El inicio de sesión real debe suministrar
el token a core/auth/Session y no debe depender de la pantalla de pruebas.

## Conectar Catálogo

La ruta es /comunidad/cursos/:cursoId. Un enlace puede aportar ?titulo=Nombre para
la cabecera, solo como texto de presentación. Si no llega un nombre se muestra el
ID del curso. El ID es la referencia externa; no existe una FK entre bases.

Aún no se comprueba existencia del curso, compra o matrícula porque Catálogo y
Pagos no tienen contratos implementados. Esas validaciones deben acordarse antes
de dar por terminada la integración. No se simula que un curso existe ni se da por
aprobada una compra desde ComunidadService.

No se ha definido una regla de una sola reseña por alumno/curso; esta entrega no
la impone. Documentar y aplicar esa regla si forma parte del requerimiento aprobado.

## Validación

- 40 pruebas Python: API, JWT, roles, validación, filtrado, resumen, auditoría
  atómica y migración upgrade/check/downgrade sobre SQLite aislado.
- 16 pruebas Angular: formularios reales, visibilidad por rol, errores, carga,
  paginación, cambio de curso, sesión y autorización HTTP.
- Builds Angular production y local correctos, sin exceder los presupuestos.
- Ruff y pip check correctos.
- Flujo HTTP real a través del proxy Angular: listar, publicar con JWT, denegar
  moderación al alumno y ocultar como administrador, sobre SQLite aislado.

Las pruebas SQLite no sustituyen verificar PostgreSQL. El entorno de preparación
no tiene Docker ni PostgreSQL, ni se realizó una inspección visual en navegador.
Al actualizar en tu equipo, comprobar el compose, la migración y el flujo anterior.
