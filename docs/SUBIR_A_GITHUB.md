# Subir esta estructura a GitHub

Preparada sobre el repositorio KLISSMAN-SC/Cursos, rama main, commit
2ac5747aaf4a255d6d538c99ff3b458da1bb2e2a, que solo tenía README vacíos y .gitignore
vacío. Este paquete no incluye .git ni modifica automáticamente el repositorio.

## 1. Abrir tu copia local

Si todavía no tienes el nuevo repositorio en tu computadora, desde la carpeta
que usas para tus proyectos ejecuta en PowerShell:

```powershell
git clone https://github.com/KLISSMAN-SC/Cursos.git
cd Cursos
```

Si ya lo tienes clonado, abre una terminal en esa carpeta. Con tu trabajo previo
guardado, actualiza main:

```powershell
git switch main
git pull --ff-only origin main
git switch -c chore/estructura-base
```

## 2. Copiar los archivos

Extrae estructura-cursos.zip en una carpeta aparte. Copia su contenido dentro de
la raíz de tu repositorio Cursos: CatalogoService, ComunidadService, FrontService,
etc. deben quedar al mismo nivel que la carpeta .git existente. Incluye también
.gitignore, .gitattributes, .editorconfig y la carpeta .github.

No crees otra carpeta Cursos dentro de Cursos. La copia se ha preparado para
reemplazar los README vacíos y el .gitignore vacío de la base indicada. Si esos
archivos ya tienen cambios nuevos de tus compañeros, intégralos antes de copiar
el contenido sobre ellos.

Los .gitkeep se incluyen para que GitHub pueda mostrar las carpetas que aún no
tienen código. No son archivos de configuración ni programas.

## 3. Registrar y subir

Desde la raíz del repositorio:

```powershell
git status --short
git add .
git diff --cached --stat
git commit -m "chore: organizar servicios y areas del frontend"
git push -u origin chore/estructura-base
```

En GitHub abre el pull request de chore/estructura-base hacia main. Revisen y
fusionen esa estructura antes de empezar las ramas de cada servicio.

## 4. Actualizar las copias del equipo

Después de integrar el pull request, cada integrante guarda su trabajo y ejecuta:

```powershell
git switch main
git pull --ff-only origin main
```

Para empezar Comunidad, crea su rama de trabajo:

```powershell
git switch -c feat/comunidad-base
```

El siguiente paso será inicializar ComunidadService y el workspace Angular
compartido. Este paquete solo organiza carpetas: todavía no se ejecuta con npm,
Uvicorn o Docker.
