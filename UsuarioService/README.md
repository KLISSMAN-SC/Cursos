# UsuarioService

Backend independiente. Área de frontend asociada:
`FrontService/src/app/FrontUsuarios/`.

Ámbito inicial propuesto: Registro, inicio y cierre de sesión, cuenta, roles y administración de usuarios.

La estructura actual es un punto de partida, no una aplicación ejecutable:

- src/: código del servicio; adaptar a las convenciones del framework elegido.
- tests/: pruebas; reubicar a src/test si corresponde al framework.
- docs/: contratos, decisiones y comprobaciones propias del servicio.

Al inicializar el servicio, agregar sus dependencias, archivo .env.example sin
secretos, migraciones si necesita base de datos y Dockerfile. Documentar aquí los
comandos reales de instalación, ejecución y pruebas. No crear un frontend separado
ni escribir directamente en la base de otro servicio.

Antes de conectarlo, completar los acuerdos de docs/contratos/README.md.
