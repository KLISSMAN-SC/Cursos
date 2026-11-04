# Contratos de integración

Crear aquí la documentación de los contratos que necesitan varios integrantes.
La especificación generada de un servicio puede permanecer en sus propios docs;
este espacio guarda los acuerdos y enlaces de integración.

Para cada operación registrar:

- Servicio dueño y funcionalidad.
- Método HTTP, ruta y parámetros.
- Identidad y roles permitidos; cómo se validan en backend.
- Tipos y formato de IDs, importes, fechas y estados.
- Ejemplo de solicitud y respuesta satisfactoria.
- Errores, códigos HTTP y respuesta del frontend ante cada error.
- Paginación o idempotencia cuando corresponda.
- Pantalla consumidora y prueba que completa el flujo.

Para cada evento registrar productor, consumidor, nombre y versión del esquema,
ID único del evento, datos obligatorios, reintentos y protección contra duplicados.
No asumir que se utilizará RabbitMQ hasta que el equipo confirme la mensajería.

Pendientes iniciales: autenticación común; consulta de cursos y contenido;
compra/pago/derechos de acceso; finalización de módulos; reseñas/moderación/logros.
Los ejemplos futuros no deben incluir claves ni contraseñas reales.
