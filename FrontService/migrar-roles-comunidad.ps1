param([switch]$Apply)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\angular.json') -or -not (Test-Path '.\src\app\FrontComunidad')) {
    throw 'Ejecuta este script desde la raiz de FrontService.'
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
$changes = @{}
foreach ($area in @('logros','moderacion','resenas')) {
    $name = @{logros='rewards'; moderacion='moderation'; resenas='reviews'}[$area]
    foreach ($suffix in @('ts','html','spec.ts')) {
        $path = Join-Path $PWD.Path "src/app/FrontComunidad/pages/$area/$name-page.component.$suffix"
        if (-not (Test-Path $path)) { throw "No existe $path" }
        $old = [IO.File]::ReadAllText($path)
        $new = $old
        foreach ($obj in @('this.session.account()','session.account()','account')) {
            foreach ($quote in @('"', "'")) {
                foreach ($role in @('ESTUDIANTE','ADMIN')) {
                    $real = if ($role -eq 'ADMIN') { 'MODERADOR_COMUNIDAD' } else { $role }
                    $comparison = "($obj`?.roles.includes($quote$real$quote) ?? false)"
                    $new = $new.Replace("$obj`?.rol === $quote$role$quote", $comparison)
                    $new = $new.Replace("$obj`?.rol !== $quote$role$quote", "!$comparison")
                }
            }
        }
        if ($suffix -eq 'spec.ts') {
            $new = [regex]::Replace($new, '\{\s*id:\s*(\d+)\s*,\s*rol:\s*"(ESTUDIANTE|ADMIN)"\s*\}', [System.Text.RegularExpressions.MatchEvaluator]{
                param($m)
                $id = $m.Groups[1].Value
                $role = if ($m.Groups[2].Value -eq 'ADMIN') { 'MODERADOR_COMUNIDAD' } else { 'ESTUDIANTE' }
                return ('{{ id: {0}, nombre: "Usuario {0}", email: "usuario{0}@example.invalid", activo: true, roles: ["{1}"], fechaCreacion: "2026-01-01T00:00:00Z" }}' -f $id,$role)
            })
        }
        # Se conserva el contenido restante de las pantallas y de sus pruebas.
        if ($new -match '\?\.rol\b|\brol:\s*"(?:ESTUDIANTE|ADMIN)"') { throw "Queda una referencia al modelo antiguo en $path. Revisala antes de aplicar." }
        if ($new -cne $old) { $changes[$path] = $new }
    }
}
$path = Join-Path $PWD.Path 'src/environments/environment.ts'
$old = [IO.File]::ReadAllText($path)
$new = $old -replace 'localSessions\s*:\s*true', 'localSessions: false'
if ($new -cne $old) { $changes[$path] = $new }
foreach ($path in ($changes.Keys | Sort-Object)) {
    if ($Apply) { [IO.File]::WriteAllText($path, $changes[$path], $utf8); Write-Host "Actualizado: $path" }
    else { Write-Host "Se modificaria: $path" }
}
if (-not $Apply) { Write-Host 'Vista previa. Ejecuta de nuevo con -Apply para escribir los cambios.' }
else { Write-Host 'Migracion terminada. Revisa git diff y ejecuta npm run build y npm test -- --watch=false.' }
