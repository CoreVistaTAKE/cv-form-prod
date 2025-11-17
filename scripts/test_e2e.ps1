param(
  [string]$BaseUrl   = "http://localhost:3000",
  [string]$ProcessUrl,
  [string]$User      = "form_PJ1",
  [string]$Bldg      = "テストビルA",
  [string]$Seq       = "001",
  [string]$Date      = ""
)

$ErrorActionPreference = 'Stop'

Write-Host "=== E2E: Phase A → Phase B ==="

$here = Split-Path -Parent $PSCommandPath
$fa   = Join-Path $here "test_phaseA.ps1"
$fb   = Join-Path $here "test_phaseB.ps1"

# Phase A
& powershell -NoProfile -ExecutionPolicy Bypass -File $fa -BaseUrl $BaseUrl -User $User -Bldg $Bldg

# 軽く待機（Flow側はDelay PT5Sで待つため短めでOK）
Start-Sleep -Seconds 3

# Phase B
$argB = @()
$argB += "-ProcessUrl"; $argB += $ProcessUrl
$argB += "-User";       $argB += $User
$argB += "-Bldg";       $argB += $Bldg
$argB += "-Seq";        $argB += $Seq
if ($Date) { $argB += "-Date"; $argB += $Date }

& powershell -NoProfile -ExecutionPolicy Bypass -File $fb @argB

Write-Host "=== E2E Done ==="
