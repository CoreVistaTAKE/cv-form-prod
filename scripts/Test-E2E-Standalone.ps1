param(
  [string]$BaseUrl    = "http://localhost:3000",
  [string]$ProcessUrl = "",
  [string]$User       = "form_PJ1",
  [string]$Bldg       = "テストビルA",
  [string]$Seq        = "001",
  [string]$Date       = "",
  [switch]$SkipA
)

$ErrorActionPreference = "Stop"

# ==== 表示ヘッダ ====
Write-Host ""
Write-Host "=== E2E: Phase A -> Phase B ===" -ForegroundColor Cyan

# ==== 共通ユーティリティ（例外でPSを落とさない） ====
function Show-WebExceptionBody {
  param([System.Net.WebException]$ex)
  try {
    if ($ex.Response) {
      $stream = $ex.Response.GetResponseStream()
      if ($stream) {
        $sr = New-Object System.IO.StreamReader($stream)
        $body = $sr.ReadToEnd()
        if ($body) { Write-Host ("Body: " + $body) -ForegroundColor Yellow }
      }
    }
  } catch { }
}

# ==== Phase A: /api/builder/create-building ====
$okA = $true
if (-not $SkipA) {
  if ([string]::IsNullOrWhiteSpace($User)) { Write-Host "ERROR: username が空" -ForegroundColor Red; $okA = $false }
  if ([string]::IsNullOrWhiteSpace($Bldg)) { Write-Host "ERROR: bldg が空" -ForegroundColor Red; $okA = $false }
  if ($Bldg -eq "BaseSystem") { Write-Host "ERROR: bldg=BaseSystem は不可" -ForegroundColor Red; $okA = $false }

  if ($okA) {
    $uriA = $BaseUrl.TrimEnd('/') + "/api/builder/create-building"
    $payloadA = [ordered]@{
      username = $User
      bldg     = $Bldg
      host     = "https://www.form.visone-ai.jp"
    }
    $jsonA  = ($payloadA | ConvertTo-Json -Depth 6 -Compress)
    $bytesA = [System.Text.Encoding]::UTF8.GetBytes($jsonA)

    Write-Host ""
    Write-Host "=== Phase A ===" -ForegroundColor Cyan
    Write-Host ("POST " + $uriA)
    Write-Host ("Body " + $jsonA) -ForegroundColor DarkGray

    try {
      $respA = Invoke-RestMethod -Uri $uriA -Method Post -ContentType "application/json; charset=utf-8" -Body $bytesA -TimeoutSec 300
      if ($respA -and $respA.ok -eq $true) {
        Write-Host ("OK: seq=" + $respA.seq + " folder=" + $respA.bldgFolderName) -ForegroundColor Green
      } else {
        Write-Host "NG: ok=false" -ForegroundColor Yellow
        if ($respA) { $respA | ConvertTo-Json -Depth 12 | Write-Host }
        $okA = $false
      }
    } catch [System.Net.WebException] {
      Write-Host ("HTTP Error: " + $_.Exception.Message) -ForegroundColor Yellow
      Show-WebExceptionBody $_.Exception
      $okA = $false
    } catch {
      Write-Host ("ERROR: " + $_.Exception.Message) -ForegroundColor Yellow
      $okA = $false
    }
  }
} else {
  Write-Host "Phase A をスキップします（-SkipA 指定）" -ForegroundColor Yellow
}

# ==== 少し待機（Flow 側の Delay PT5S は別処理なので軽め） ====
Start-Sleep -Seconds 3

# ==== Phase B: Flow (HTTP request trigger) ====
$okB = $true
if ([string]::IsNullOrWhiteSpace($ProcessUrl) -or $ProcessUrl -match "\.\.\." -or -not ($ProcessUrl -match "^https?://")) {
  Write-Host "ERROR: -ProcessUrl に Flow の HTTP POST URL（httpsで始まる完全な文字列）を指定してください。" -ForegroundColor Red
  $okB = $false
}

if ([string]::IsNullOrWhiteSpace($Date)) {
  $Date = (Get-Date).ToString("yyMMdd")
}

if ($okB) {
  $payloadB = [ordered]@{
    user = $User
    bldg = $Bldg
    seq  = $Seq
    date = $Date
  }
  $jsonB  = ($payloadB | ConvertTo-Json -Depth 6 -Compress)
  $bytesB = [System.Text.Encoding]::UTF8.GetBytes($jsonB)

  Write-Host ""
  Write-Host "=== Phase B ===" -ForegroundColor Cyan
  Write-Host ("POST " + $ProcessUrl)
  Write-Host ("Body " + $jsonB) -ForegroundColor DarkGray

  try {
    $respB = Invoke-RestMethod -Uri $ProcessUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $bytesB -TimeoutSec 900
    if ($respB -and $respB.ok -eq $true -and $respB.pdfPath) {
      Write-Host ("OK: pdfPath=" + $respB.pdfPath) -ForegroundColor Green
    } else {
      Write-Host "NG: ok=false または pdfPath 欠落" -ForegroundColor Yellow
      if ($respB) { $respB | ConvertTo-Json -Depth 12 | Write-Host }
      $okB = $false
    }
  } catch [System.Net.WebException] {
    Write-Host ("HTTP Error: " + $_.Exception.Message) -ForegroundColor Yellow
    Show-WebExceptionBody $_.Exception
    $okB = $false
  } catch {
    Write-Host ("ERROR: " + $_.Exception.Message) -ForegroundColor Yellow
    $okB = $false
  }
}

# ==== 結果表示 ====
Write-Host ""
Write-Host "=== E2E Done ===" -ForegroundColor Cyan
if ($okA -and $okB) {
  Write-Host "RESULT: OK (A and B)" -ForegroundColor Green
} elseif ($okB) {
  Write-Host "RESULT: Phase B OK / Phase A NG" -ForegroundColor Yellow
} elseif ($okA) {
  Write-Host "RESULT: Phase A OK / Phase B NG" -ForegroundColor Yellow
} else {
  Write-Host "RESULT: NG (A and B)" -ForegroundColor Red
}
