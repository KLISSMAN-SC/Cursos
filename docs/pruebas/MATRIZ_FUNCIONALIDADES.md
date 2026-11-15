# Matriz de funcionalidades

Esta tabla es el alcance inicial propuesto y debe ajustarse a los requerimientos
aprobados del curso. Las filas de otros dominios siguen pendientes; las carpetas vacías no prueban
implementación. Comunidad se contrasta con RN10–RN12 y CU06/CU07/CU09 del informe.

Una funcionalidad queda lista cuando se comprueba su regla en backend y se puede
usar desde la pantalla con la identidad correcta, incluidos errores y permisos.

| Funcionalidad | Backend | Frontend/pantalla | Comprobación mínima | Estado |
| --- | --- | --- | --- | --- |
| Estado del proceso y conexión a base | ComunidadService | /docs (comprobación técnica) | Pruebas HTTP, SQL y PostgreSQL 16.2 correctas; compose PostgreSQL 17 pendiente de comprobar | Base técnica implementada |
| Registro, ingreso y cierre de sesión | UsuarioService | FrontUsuarios | Identidad válida, error de credenciales y sesión compartida | Pendiente |
| Cuenta y gestión de usuarios | UsuarioService | FrontUsuarios | Roles y acciones autorizadas | Pendiente de confirmar alcance |
| Consultar catálogo y detalle | CatalogoService | FrontCatalogo | Navegar desde listado a curso | Pendiente |
| Gestionar borrador y contenido | CatalogoService | FrontCatalogo | Crear contenido y aplicar reglas acordadas de publicación | Pendiente |
| Comprar y simular pago | PagoService | FrontPagos | Aprobación/rechazo desde la pantalla, sin cobro real | Pendiente |
| Conceder acceso tras pago | Dueño a acordar | FrontPagos y FrontProgreso | Compra aprobada habilita el curso al alumno correcto | Pendiente |
| Registrar avance | ProgresoService | FrontProgreso | Avance de la cuenta correcta y control de acceso | Pendiente |
| Consultar reseñas de curso | ComunidadService | FrontComunidad/resenas | Visibles, resumen, paginación y vacío; pruebas API/UI | Implementado; verificar en Docker |
| Publicar/editar reseña propia | ComunidadService | FrontComunidad/resenas | Una activa por alumno/curso; derecho ACTIVO, edición del autor y errores 403/409/503 | Implementado; adaptar servicios reales de Usuarios/Catálogo |
| Ocultar e inspeccionar historial | ComunidadService | FrontComunidad/moderacion y tarjetas | ADMIN, motivo, auditoría atómica e inmutable en PostgreSQL; ocultas fuera de promedio público | Implementado; pruebas API/UI/PostgreSQL |
| Consultar puntos y logros | ComunidadService | FrontComunidad/logros | Totales propios, páginas, errores y cero real sin logros | Implementado; pruebas API/UI |
| Consumir premio por hito | ComunidadService | FrontComunidad/logros | UUID y hito únicos; evento/insignia atómicos; 10 puntos; reintentos y DLQ | Consumidor implementado; RabbitMQ real pendiente de ejecutar en Docker/CI |
| Emitir hito desde avance | ProgresoService | FrontProgreso | Outbox y evento ModuloCompletado del módulo/versión | Pendiente del responsable de Progreso |

En los pull requests indicar qué fila se completó y cómo se comprobó el flujo.
