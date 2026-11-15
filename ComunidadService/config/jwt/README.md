# Clave pública de UsuarioService

Configurar usuarios-public.pem con la clave pública RS256 del emisor acordado.
La clave privada de UsuarioService nunca debe copiarse a ComunidadService.

La herramienta scripts.preparar_pruebas_jwt permite probar localmente con una
clave distinta. Su clave privada y los tokens quedan en .local-auth/, que no se
incluye en Git ni se monta en el backend. Esta carpeta se monta como solo lectura.
