# Cursos

Repositorio del equipo: cinco servicios backend independientes y una aplicación
frontend Angular compartida, organizada por áreas funcionales.

El repositorio contiene la estructura inicial y sus acuerdos propuestos.
ComunidadService ya incluye una base ejecutable FastAPI/PostgreSQL con endpoints
de salud, Docker y pruebas; consultar su README para arrancarla. Sus funciones de
negocio y pantallas siguen pendientes. Los demás backends y el frontend mantienen
su estructura inicial. El equipo debe confirmar los contratos de integración.

## Distribución del trabajo

| Backend | Área del frontend | Responsabilidad |
| --- | --- | --- |
| UsuarioService | FrontService/src/app/FrontUsuarios | Sesión, cuenta y gestión de usuarios |
| CatalogoService | FrontService/src/app/FrontCatalogo | Cursos, contenido y administración de cursos |
| PagoService | FrontService/src/app/FrontPagos | Compra, simulador e historial de pagos |
| ProgresoService | FrontService/src/app/FrontProgreso | Aprendizaje y seguimiento del avance |
| ComunidadService | FrontService/src/app/FrontComunidad | Reseñas, moderación, puntos y logros |

Cada integrante desarrolla y prueba su backend y sus pantallas. Todos usan una
misma navegación, sesión y biblioteca visual. Los componentes administrativos de
cada área permanecen en esa misma área; no se deben dejar pendientes para otro
frontend administrativo.

## Carpetas compartidas

- FrontService/src/app/core: sesión, guardias y comunicación HTTP transversal.
- FrontService/src/app/layout: estructura de navegación de la aplicación.
- FrontService/src/app/shared: componentes visuales reutilizables; sin reglas de
  negocio ni clientes HTTP específicos de un servicio.
- docs/arquitectura: límites y acuerdos entre los servicios.
- docs/contratos: acuerdos de APIs, identidad y eventos.
- docs/pruebas: seguimiento de cada requerimiento desde API hasta pantalla.
- infra: configuración y scripts de infraestructura compartida cuando se concrete
  el despliegue. Las migraciones pertenecen al servicio que posee la base.

Los Dockerfile y archivos de dependencias se crearán dentro del servicio
correspondiente al inicializarlo. El archivo compose.yaml del conjunto se creará
en la raíz cuando existan servicios ejecutables. No hay archivos vacíos que
pretendan ser configuraciones operativas.

## Organización por tecnología

ComunidadService tiene una estructura para Python/FastAPI. Es la propuesta para
retomar el servicio con la tecnología conocida. Los otros cuatro backends tienen
src, tests y docs como punto de partida; sus responsables deben adaptar esas
carpetas a las convenciones de su framework antes de generar el proyecto (por
ejemplo, src/main y src/test en Java).

FrontService será una única aplicación Angular. Las carpetas FrontComunidad,
FrontUsuarios, FrontCatalogo, FrontPagos y FrontProgreso son áreas de esa aplicación,
no proyectos Angular separados. La inicialización del workspace y las
modificaciones a sus archivos centrales deben coordinarse y realizarse una vez.

## Forma de trabajar

1. Crear una rama para un cambio concreto: feat/comunidad-resenas,
   feat/catalogo-cursos, feat/usuarios-sesion, feat/pagos-simulador, etc.
2. Definir el contrato necesario con los integrantes afectados.
3. Implementar backend, pantalla, permisos y estados de error del requerimiento.
4. Probar la API y completar el flujo desde el frontend integrado.
5. Abrir un pull request a main y revisar los cambios antes de integrar.

Las rutas globales, core/auth, el menú, las dependencias y la infraestructura son
archivos compartidos: coordinar los cambios para evitar que un área rompa otra.
No compartir código interno ni acceder directamente a la base de otro servicio.

Los archivos .gitkeep solo permiten que Git registre carpetas todavía vacías;
pueden retirarse cuando la carpeta tenga código. Mantener los nombres y
mayúsculas de los directorios: Linux distingue ComunidadService de comunidadservice.

Ver [instalación de la estructura](docs/SUBIR_A_GITHUB.md),
[contratos](docs/contratos/README.md) y
[matriz de funcionalidades](docs/pruebas/MATRIZ_FUNCIONALIDADES.md).
