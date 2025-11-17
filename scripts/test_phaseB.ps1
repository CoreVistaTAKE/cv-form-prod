param(
  [string]$ProcessUrl,
  [string]$User = "form_PJ1",
  [string]$Bldg = "テストビルA",
  [string]$Seq  = "001",
  [string]$Date = ""
)

$ErrorActionPreference = 'Stop'

# URL 妥当性（プレースホルダ '...' は弾く）
if ([string]::IsNullOrWhiteSpace($ProcessUrl) -or $ProcessUrl -match "\.\.\." -or -not ($ProcessUrl -match "^https?://")) {
  Write-Host "ERROR: -ProcessUrl にフローの HTTP POST URL（完全な https）を指定してください。" -ForegroundColor Red
  return
}

if ([string]::IsNullOrWhiteSpace($Date)) {
  $Date = (Get-Date).ToString("yyMMdd")
}

$payload = [ordered]@{
  user = $User
  bldg = $Bldg
  seq  = $Seq
  date = $Date
}
$json  = ($payload | ConvertTo-Json -Depth 6 -Compress)
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

Write-Host "=== Phase B ==="
Write-Host ("POST " + $ProcessUrl)
Write-Host ("Body " + $json)

try {
  $resp = Invoke-RestMethod -Uri $ProcessUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 900
  if ($resp -and $resp.ok -eq $true -and $resp.pdfPath) {
    Write-Host ("OK: pdfPath=" + $resp.pdfPath) -ForegroundColor Green
    $resp | ConvertTo-Json -Depth 12
  } else {
    Write-Host "NG: ok=false または pdfPath 欠落" -ForegroundColor Yellow
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
