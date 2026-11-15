$ErrorActionPreference = 'Stop'
# Ejecutar desde la raiz de usuario-service.
if (-not (Test-Path .\pom.xml)) { throw 'Ejecuta desde usuario-service' }
$destino = Join-Path $PWD.Path 'src/main/resources/db/migration/V2__crear_estructura_oauth2.sql'
if (Test-Path $destino) { throw 'V2 ya existe. No se sobrescribira; comprueba el archivo existente.' }
docker run --rm `
    -v "${PWD}:/app" `
    -v aulabreve_maven_cache:/root/.m2 `
    -w /app `
    maven:3.9-eclipse-temurin-21 `
    mvn -B dependency:copy-dependencies `
    '-DincludeArtifactIds=spring-security-oauth2-authorization-server' `
    '-DoutputDirectory=target/oauth2-schema'
if ($LASTEXITCODE -ne 0) { throw 'Error al extraer dependencias Maven' }
$archivos = @(Get-ChildItem .\target\oauth2-schema -Filter 'spring-security-oauth2-authorization-server-*.jar')
if ($archivos.Count -ne 1) { throw 'Se esperaba exactamente un JAR de Authorization Server' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($archivos[0].FullName)
$base = 'org/springframework/security/oauth2/server/authorization'
$rutas = @(
    "$base/client/oauth2-registered-client-schema.sql",
    "$base/oauth2-authorization-schema.sql",
    "$base/oauth2-authorization-consent-schema.sql"
)
try {
    $scripts = foreach ($ruta in $rutas) {
        $entrada = $zip.GetEntry($ruta)
        if (-not $entrada) { throw "No se encontro $ruta" }
        $reader = New-Object System.IO.StreamReader($entrada.Open())
        try { $reader.ReadToEnd() } finally { $reader.Dispose() }
    }
    $sql = $scripts -join "`n`n"
    $sql = $sql -replace '(?im)^(\s+\w+\s+)blob\b', '$1text' `
                -replace '(?im)^(\s+\w+\s+)timestamp\b', '$1timestamptz'
    $sql += "`n`nCREATE UNIQUE INDEX ux_oauth2_client_id ON oauth2_registered_client(client_id);"
    $sql += "`nCREATE INDEX ix_oauth2_principal ON oauth2_authorization(principal_name);`n"
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($destino, $sql, $utf8)
    Write-Host 'Migracion V2 creada correctamente'
} finally { $zip.Dispose() }
