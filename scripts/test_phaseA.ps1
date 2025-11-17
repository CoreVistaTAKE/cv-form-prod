param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$User    = "form_PJ1",
  [string]$Bldg    = "テストビルA"
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($User)) { Write-Host "ERROR: username が空"; return }
if ([string]::IsNullOrWhiteSpace($Bldg)) { Write-Host "ERROR: bldg が空"; return }
if ($Bldg -eq "BaseSystem") { Write-Host "ERROR: bldg=BaseSystem は不可"; return }

$uri = $BaseUrl.TrimEnd('/') + "/api/builder/create-building"

$payload = [ordered]@{
  username = $User
  bldg     = $Bldg
  host     = "https://www.form.visone-ai.jp"
}
$json  = ($payload | ConvertTo-Json -Depth 6 -Compress)
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

Write-Host "=== Phase A ==="
Write-Host ("POST " + $uri)
Write-Host ("Body " + $json)

try {
  $resp = Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 300
  if ($resp -and $resp.ok -eq $true) {
    Write-Host ("OK: seq=" + $resp.seq + " folder=" + $resp.bldgFolderName) -ForegroundColor Green
    $resp | ConvertTo-Json -Depth 12
  } else {
    Write-Host "NG: ok=false" -ForegroundColor Yellow
    if ($resp) { $resp | ConvertTo-Json -Depth 12 }
  }
}
catch {
  Write-Host ("HTTP Error: " + $_.Exception.Message) -ForegroundColor Yellow
  if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $sr.ReadToEnd()
    if ($body) { Write-Host ("Body: " + $body) -ForegroundColor Yellow }
  }
}
