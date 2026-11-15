$ErrorActionPreference = 'Stop'
if (-not (Test-Path .\pom.xml)) { throw 'Ejecuta desde usuario-service' }
if (-not (Test-Path .\.env)) { throw 'No existe el .env de desarrollo' }
New-Item -ItemType Directory -Force .\.secrets | Out-Null
$linea = Get-Content .\.env | Where-Object { $_ -match '^AUTH_KEYSTORE_PASSWORD=' } | Select-Object -First 1
if (-not $linea) {
    if (Test-Path .\.secrets\usuario-signing.p12) { throw 'Existe el almacen pero falta su contrasena' }
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $clave = [Convert]::ToBase64String($bytes)
    $linea = "AUTH_KEYSTORE_PASSWORD=$clave"
    # Asegurar que se anada en una linea independiente.
    Add-Content -Encoding ascii .\.env "`n$linea"
}
$env:AUTH_KEYSTORE_PASSWORD = $linea.Substring('AUTH_KEYSTORE_PASSWORD='.Length)
if ([string]::IsNullOrWhiteSpace($env:AUTH_KEYSTORE_PASSWORD)) { throw 'AUTH_KEYSTORE_PASSWORD vacia' }
$secretDir = (Resolve-Path .\.secrets).Path
try {
    if (-not (Test-Path .\.secrets\usuario-signing.p12)) {
        docker run --rm `
            -e AUTH_KEYSTORE_PASSWORD `
            -v "${secretDir}:/keys" `
            maven:3.9-eclipse-temurin-21 `
            keytool -genkeypair `
            -alias aulabreve-signing `
            -keyalg RSA -keysize 2048 -validity 3650 `
            -dname 'CN=AulaBreve UsuarioService' `
            -storetype PKCS12 `
            -keystore /keys/usuario-signing.p12 `
            -storepass:env AUTH_KEYSTORE_PASSWORD `
            -keypass:env AUTH_KEYSTORE_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'Error al generar claves' }
    }
    Write-Host 'Almacen PKCS12 disponible'
} finally {
    Remove-Item Env:AUTH_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Variable clave,linea -ErrorAction SilentlyContinue
}
