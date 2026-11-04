# FrontProgreso

Área funcional dentro de la única aplicación Angular FrontService.

- pages/: pantallas de esta área, incluidas sus acciones administrativas.
- components/: piezas reutilizadas solo dentro de esta área.
- services/: clientes HTTP y estado específicos de esta área.
- models/: tipos de los contratos usados por esta área.

Pantallas iniciales propuestas: mi-aprendizaje, avance-curso.
Todas están pendientes de implementación y acuerdo de contrato.

Usar la sesión de core/auth y los componentes de shared. Evitar crear otro login,
un package.json propio o un workspace Angular dentro de esta carpeta. Coordinar
la inclusión de las rutas de esta área en el archivo de rutas global.
