param([string]$ConfigPath = (Join-Path $PSScriptRoot '../windows/google-oauth-client.json'))
$ErrorActionPreference = 'Stop'
$config = Get-Content -Raw -LiteralPath $ConfigPath | ConvertFrom-Json
# Deliberately invalid code. No user credentials are used and no tokens can be issued.
$body = @{
    client_id = $config.client_id
    grant_type = 'authorization_code'
    code = 'silverlight-invalid-code-configuration-probe'
    code_verifier = ('a' * 64)
    redirect_uri = 'http://127.0.0.1:49152/'
}
if ($config.desktop_client_value) { $body.client_secret = $config.desktop_client_value }
$response = Invoke-WebRequest -Uri 'https://oauth2.googleapis.com/token' -Method Post -Body $body -SkipHttpErrorCheck
$failure = $response.Content | ConvertFrom-Json
if ([int]$response.StatusCode -ne 400 -or $failure.error -ne 'invalid_grant') {
    throw "Google Desktop client configuration is not ready: $($failure.error) - $($failure.error_description). Do not publish authentication as validated."
}
Write-Output 'PASS: Google accepts installed-app client parameters and rejects the deliberately invalid authorization code. Real-account sign-in still requires confirmation.'
