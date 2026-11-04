# Arquitectura y decisiones iniciales

Propuesta inicial: un repositorio, cinco backends y una aplicación frontend.
Cada backend puede tener su tecnología y su base de datos; ningún backend accede
al almacenamiento privado de otro. El frontend se divide por funcionalidades,
con sesión, layout y componentes visuales compartidos.

La navegación y sesión comunes requieren coordinación. Esta estructura reduce
la integración entre aplicaciones frontend independientes, pero los cambios a
archivos globales siguen necesitando revisión del equipo.

## Confirmar antes de implementar

| Decisión | Responsable de proponer | Participantes |
| --- | --- | --- |
| Identidad, rol, sesión y expiración | UsuarioService | Todos los servicios y FrontService |
| IDs y contratos de cursos, módulos y lecciones | CatalogoService | ProgresoService, PagoService y ComunidadService |
| Propiedad y consulta de derechos de acceso | CatalogoService y PagoService | ProgresoService y FrontService |
| Estados del pago y simulador | PagoService | CatalogoService y FrontPagos |
| Eventos de finalización y reintentos | ProgresoService | ComunidadService |
| Reglas de reseñas, moderación y premios | ComunidadService | UsuarioService y FrontComunidad |
| Versión y configuración inicial de Angular | Equipo de frontend | Todos los integrantes |
| Puertos, proxy y despliegue Docker | Equipo | Todos los integrantes |

No se fijan en este esqueleto puertos, URLs, eventos definitivos ni tipos de ID.
Anotar aquí las decisiones acordadas para no depender de lo conversado en privado.
