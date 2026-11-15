# Ejecutar en la misma terminal donde se realizaran las pruebas posteriores.
$ErrorActionPreference = 'Stop'
function Convertir-Base64Url([byte[]]$bytes) {
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}
function Nuevo-ValorAleatorio {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return (Convertir-Base64Url $bytes)
}
$verifier = Nuevo-ValorAleatorio
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try { $challenge = Convertir-Base64Url ($sha256.ComputeHash([System.Text.Encoding]::ASCII.GetBytes($verifier))) }
finally { $sha256.Dispose() }
$state = Nuevo-ValorAleatorio
$nonce = Nuevo-ValorAleatorio
$redirectUri = 'http://localhost:4200/auth/callback'
$parametros = [ordered]@{
    response_type = 'code'
    client_id = 'aulabreve-angular'
    scope = 'openid profile aulabreve.api'
    redirect_uri = $redirectUri
    code_challenge = $challenge
    code_challenge_method = 'S256'
    state = $state
    nonce = $nonce
}
$query = ($parametros.GetEnumerator() | ForEach-Object { $_.Key + '=' + [Uri]::EscapeDataString([string]$_.Value) }) -join '&'
Start-Process "http://localhost:8081/oauth2/authorize?$query"
$callback = [Uri](Read-Host 'Pega la URL completa de retorno del navegador (no compartir)')
if ($callback.GetLeftPart([UriPartial]::Path) -cne $redirectUri) { throw 'Direccion de retorno no valida' }
$datos = @{}
foreach ($par in $callback.Query.TrimStart('?').Split('&')) {
    $partes = $par -split '=', 2
    if ($partes.Count -eq 2) { $datos[$partes[0]] = [Uri]::UnescapeDataString($partes[1]) }
}
if ($datos['state'] -cne $state) { throw 'State incorrecto' }
if (-not $datos['code']) { throw 'No se recibio codigo de autorizacion' }
$tokenBody = @{
    grant_type = 'authorization_code'
    client_id = 'aulabreve-angular'
    code = $datos['code']
    redirect_uri = $redirectUri
    code_verifier = $verifier
}
$global:tokens = Invoke-RestMethod -Uri 'http://localhost:8081/oauth2/token' -Method Post `
    -ContentType 'application/x-www-form-urlencoded' -Body $tokenBody
[PSCustomObject]@{
    token_type = $tokens.token_type
    expires_in = $tokens.expires_in
    scope = $tokens.scope
    access_token_recibido = [bool]$tokens.access_token
    id_token_recibido = [bool]$tokens.id_token
}
# Prueba manual de intercambio, no reemplaza la validacion OIDC completa de Angular.
