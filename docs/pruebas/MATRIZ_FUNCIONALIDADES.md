# Matriz de funcionalidades

Esta tabla es el alcance inicial propuesto y debe ajustarse a los requerimientos
aprobados del curso. Las filas de negocio siguen pendientes; las carpetas existentes
no son evidencia de implementación. La base técnica se registra por separado.

Una funcionalidad queda lista cuando se comprueba su regla en backend y se puede
usar desde la pantalla con la identidad correcta, incluidos errores y permisos.

| Funcionalidad | Backend | Frontend/pantalla | Comprobación mínima | Estado |
| --- | --- | --- | --- | --- |
| Estado del proceso y conexión a base | ComunidadService | /docs (comprobación técnica) | Pruebas HTTP y SQL local correctas; PostgreSQL en Docker pendiente de comprobar en el equipo | Base técnica implementada |
| Registro, ingreso y cierre de sesión | UsuarioService | FrontUsuarios | Identidad válida, error de credenciales y sesión compartida | Pendiente |
| Cuenta y gestión de usuarios | UsuarioService | FrontUsuarios | Roles y acciones autorizadas | Pendiente de confirmar alcance |
| Consultar catálogo y detalle | CatalogoService | FrontCatalogo | Navegar desde listado a curso | Pendiente |
| Gestionar borrador y contenido | CatalogoService | FrontCatalogo | Crear contenido y aplicar reglas acordadas de publicación | Pendiente |
| Comprar y simular pago | PagoService | FrontPagos | Aprobación/rechazo desde la pantalla, sin cobro real | Pendiente |
| Conceder acceso tras pago | Dueño a acordar | FrontPagos y FrontProgreso | Compra aprobada habilita el curso al alumno correcto | Pendiente |
| Registrar avance | ProgresoService | FrontProgreso | Avance de la cuenta correcta y control de acceso | Pendiente |
| Consultar reseñas de curso | ComunidadService | FrontComunidad/resenas | Mostrar visibles y estado sin resultados | Pendiente |
| Publicar reseña | ComunidadService | FrontComunidad/resenas | Validación de datos e identidad del alumno | Pendiente |
| Ocultar reseña con motivo | ComunidadService | FrontComunidad/moderacion | Acción de administrador, auditoría y reseña no pública | Pendiente |
| Consultar puntos y logros | ComunidadService | FrontComunidad/logros | Resultados propios y estado sin logros | Pendiente |
| Otorgar premio por hito | ProgresoService y ComunidadService | FrontComunidad/logros | Evento acordado; repetirlo no duplica premios | Pendiente |

En los pull requests indicar qué fila se completó y cómo se comprobó el flujo.
