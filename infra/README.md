# Infraestructura compartida

- scripts/: scripts para tareas comunes del entorno.
- postgres/: configuración e inicialización compartida, si se usa PostgreSQL.
- rabbitmq/: configuración del broker, solo si se confirma esa integración.

Las carpetas son reservas de organización. No hay servicios ejecutables ni un
compose.yaml todavía; se agregará el compose del conjunto a la raíz cuando estén
listos los primeros servicios. Cada backend y FrontService tendrán su Dockerfile.

Los datos persistentes, respaldos y secretos no se versionan. Las migraciones de
cada base de datos pertenecen a su servicio. Mantener los scripts .sh con finales
LF; .gitattributes evita repetir el problema de scripts Docker con CRLF de Windows.
