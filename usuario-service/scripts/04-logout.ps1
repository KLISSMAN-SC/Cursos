$ErrorActionPreference = 'Stop'
if (-not $tokens.id_token) { throw 'Ejecuta primero 03-pkce.ps1' }
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$logoutState = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
$idTokenHint = [Uri]::EscapeDataString($tokens.id_token)
$postLogoutUri = [Uri]::EscapeDataString('http://localhost:4200/')
$logoutUrl = 'http://localhost:8081/connect/logout' + "?id_token_hint=$idTokenHint&post_logout_redirect_uri=$postLogoutUri&state=$logoutState"
Start-Process $logoutUrl
