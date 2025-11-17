param(
  [string]$ProcessUrl,
  [string]$User = "form_PJ1",
  [string]$Bldg = "テストビルA",
  [string]$Seq  = "001",
  [string]$Date = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ProcessUrl) -or $ProcessUrl -match "\.\.\." -or -not ($ProcessUrl -match "^https?://")) {
  Write-Host "ERROR: -ProcessUrl に Flow の HTTP POST URL（https で始まる長い URL 全体）を貼ってください。" -ForegroundColor Red
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
$json  = ($payload | ConvertTo-Json -Depth 5 -Compress)
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

Write-Host "=== Phase B (ProcessFormSubmission) ===" -ForegroundColor Cyan
Write-Host ("POST  " + $ProcessUrl)
Write-Host ("Body  " + $json) -ForegroundColor DarkGray

try {
  $resp = Invoke-RestMethod -Uri $ProcessUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 900
  if ($resp -and $resp.ok -eq $true -and $resp.pdfPath) {
    Write-Host ("OK: pdfPath=" + $resp.pdfPath) -ForegroundColor Green
  } else {
    Write-Host "NG: ok=false または pdfPath 欠落" -ForegroundColor Yellow
    if ($resp) { $resp | ConvertTo-Json -Depth 12 | Write-Host }
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
