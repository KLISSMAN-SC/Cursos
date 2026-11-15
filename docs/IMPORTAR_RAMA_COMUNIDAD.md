# Incorporar la rama de Comunidad

La entrega incluye Cursos_comunidad_completa.bundle, que conserva la rama
feat/comunidad-completa y todo su historial, y un ZIP con el código completo.
La rama parte de feat/comunidad-resenas; main no fue fusionado ni modificado.
No contiene contraseñas reales, claves privadas, bases de datos ni node_modules.

## Si ya tienes el repositorio Cursos

Descarga el archivo .bundle y colócalo junto a la carpeta Cursos, no dentro de ella.
Desde una terminal en Cursos, con tus cambios locales guardados:

```powershell
git bundle verify ../Cursos_comunidad_completa.bundle
git fetch ../Cursos_comunidad_completa.bundle feat/comunidad-completa:feat/comunidad-completa
git switch feat/comunidad-completa
git log --oneline -3
```

Si ya existe una rama local con ese nombre y Git rechaza la actualización, conserva
su contenido y usa otro nombre para importar, por ejemplo:

```powershell
git fetch ../Cursos_comunidad_completa.bundle feat/comunidad-completa:feat/comunidad-entrega
git switch feat/comunidad-entrega
```

No fuerces la actualización de una rama que tenga tu trabajo sin revisar.
Tu .env y tus volúmenes no se incluyen ni se reemplazan con la importación.

## Si quieres una copia nueva

Desde la carpeta que contiene el .bundle:

```powershell
git clone -b feat/comunidad-completa Cursos_comunidad_completa.bundle CursosComunidad
cd CursosComunidad
git remote set-url origin https://github.com/KLISSMAN-SC/Cursos.git
```

## Ejecutar y subir

Seguir [la guía de instalación y demostración](../ComunidadService/docs/COMUNIDAD_COMPLETA.md).
Con tu sesión Git habitual en tu equipo, desde la raíz del repositorio:

```powershell
git push -u origin HEAD:feat/comunidad-completa
```

Después abre un pull request desde feat/comunidad-completa hacia main. Ese PR
incluye tanto la base anterior de reseñas como esta continuación, porque main
todavía solo contiene la estructura inicial del equipo. Revisa el workflow
Comunidad antes de fusionar y coordina los cambios del menú/rutas compartidos.

El ZIP permite revisar el código sin Git, pero el .bundle es la opción para
continuar exactamente sobre la rama con sus commits. No copies el ZIP encima de
una carpeta con cambios locales sin compararlos primero.
