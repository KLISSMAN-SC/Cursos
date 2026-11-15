$ErrorActionPreference = 'Stop'
function Obtener-VariableEnv([string]$nombre) {
    $linea = Get-Content .\.env | Where-Object { $_.StartsWith("$nombre=") } | Select-Object -First 1
    if (-not $linea) { throw "No se encontro $nombre en .env" }
    return $linea.Substring($nombre.Length + 1)
}
$env:DB_PASSWORD = Obtener-VariableEnv 'USUARIO_DB_PASSWORD'
$env:AUTH_KEYSTORE_PASSWORD = Obtener-VariableEnv 'AUTH_KEYSTORE_PASSWORD'
try {
    docker run --rm `
        --network aulabreve-usuario_default `
        -e DB_HOST=usuario-db `
        -e DB_PORT=5432 `
        -e DB_NAME=usuarios_db `
        -e DB_USER=usuario_app `
        -e DB_PASSWORD `
        -e AUTH_KEYSTORE_PASSWORD `
        -e AUTH_KEYSTORE_PATH=/app/.secrets/usuario-signing.p12 `
        -v "${PWD}:/app" `
        -v aulabreve_maven_cache:/root/.m2 `
        -w /app `
        maven:3.9-eclipse-temurin-21 `
        mvn -B test
    if ($LASTEXITCODE -ne 0) { throw 'Las pruebas no finalizaron correctamente' }
} finally {
    Remove-Item Env:DB_PASSWORD,Env:AUTH_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
}
