# FrontService

Una aplicación Angular compartida. El workspace está inicializado y FrontComunidad
incluye la consulta, publicación y moderación de reseñas. Las carpetas de los demás
integrantes se conservan para sus propias áreas.

## Arranque con Docker

Usar el compose de ComunidadService con el perfil front, siguiendo
[la guía de reseñas](../ComunidadService/docs/RESENAS.md). Abrir http://localhost:4200.
El proxy de Nginx conecta /api/comunidad/ con ComunidadService dentro de Docker.

## Desarrollo local

Requiere Node 24 LTS compatible con Angular 22 y npm. Desde FrontService:

```powershell
npm ci
npm start
```

El proxy de desarrollo conecta con http://127.0.0.1:8001. Mantener ComunidadService
arrancado en ese puerto; si cambias el puerto, ajustar proxy.conf.json.

```powershell
npm test -- --watch=false
npm run build
npm run build:local
```

production deshabilita la ruta de sesiones de prueba; local y ng serve la habilitan.
La carpeta de salida es dist/cursos-front/browser. El Dockerfile compila production
por defecto; el compose de pruebas elige local explícitamente.

## Reparto

- src/app/FrontComunidad: API, tipos, resumen, tarjetas y página de reseñas.
- src/app/FrontUsuarios: reservada para el responsable de usuarios.
- src/app/FrontCatalogo: reservada para Catálogo.
- src/app/FrontPagos: reservada para Pagos.
- src/app/FrontProgreso: reservada para Progreso.
- src/app/core/auth: identidad verificada por backend y almacenamiento de sesión.
- src/app/core/http: interceptor que adjunta JWT solo a /api/comunidad/.
- src/app/app.routes.ts y app.config.ts: rutas y configuración globales compartidas.

La sesión compartida actual acepta un JWT y consulta /api/v1/sesion antes de
habilitar funciones por rol. No se confía en decodificar el rol en el navegador.
El token elegido vive en sessionStorage; no se guardan contraseñas ni claves
privadas. Al integrar UsuarioService, conectar su login real con este adaptador y
coordinar el interceptor de las otras áreas: el actual no envía tokens a dominios
ajenos ni a rutas de otros servicios.

Cada área contiene pages, components, services y models. Las pruebas .spec.ts se
ubican junto al código. Coordinar cambios a rutas, core, dependencias y estilos
comunes; cada integrante continúa su backend y pantallas en una rama propia.
