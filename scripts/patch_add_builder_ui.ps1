# scripts/patch_add_builder_ui.ps1 (v3, ASCII only)
param(
  [string]$Root = "C:\Users\taked\Desktop\CoreVistaJP\base\form\corevista-form-builder-starter-v0.5.0"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# target files
$pageCandidates = @(
  (Join-Path $Root "app\page.tsx"),
  (Join-Path $Root "src\app\page.tsx")  # fallback pattern
) | Where-Object { Test-Path $_ }

if ($pageCandidates.Count -eq 0) { throw "page.tsx not found under app\ or src\app\." }
$page = $pageCandidates[0]

$panel = Join-Path $Root "app\_components\BuildingFolderPanel.tsx"
if (-not (Test-Path $panel)) { throw "BuildingFolderPanel.tsx not found: $panel" }

# backup
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupDir = Join-Path $Root ("__backup\patch_5.9.0_" + $stamp)
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item $page (Join-Path $backupDir "page.tsx") -Force

# read
$src = Get-Content -Raw -Encoding utf8 $page

# 1) ensure import
$import = "import BuildingFolderPanel from './_components/BuildingFolderPanel';"
if ($src -notmatch [regex]::Escape($import)) {
  $patternUseClient = @'
^\s*(?:'use client'|"use client");[^\r\n]*\r?\n
'@
  $m = [regex]::Match($src, $patternUseClient, [System.Text.RegularExpressions.RegexOptions]::Multiline)
  if ($m.Success) {
    $src = $src.Insert($m.Index + $m.Length, $import + [Environment]::NewLine)
  } else {
    $src = $import + [Environment]::NewLine + $src
  }
}

# 2) insert <BuildingFolderPanel /> as first child of root JSX (idempotent)
if ($src -notmatch "<BuildingFolderPanel\b") {
  # find "return" followed by "<"
  $mReturn = [regex]::Match($src, "return\s*(\(\s*)?\s*<", [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $mReturn.Success) { throw "Root JSX after 'return' not found." }

  $startFrom = $mReturn.Index
  $lt = $src.IndexOf('<', $startFrom)
  if ($lt -lt 0) { throw "Root '<' not found after return." }
  $gt = $src.IndexOf('>', $lt)
  if ($gt -lt 0) { throw "Root '>' not found after return." }

  # compute indent: whitespace of the line containing the root tag + two spaces
  $nl = [Environment]::NewLine
  $indent = "  "
  $lineStart = $src.LastIndexOf($nl, $lt)
  if ($lineStart -ge 0) {
    $lineStart += $nl.Length
    $i = $lineStart
    $buf = ""
    while ($i -lt $src.Length -and (($src[$i] -eq [char]32) -or ($src[$i] -eq [char]9))) {
      $buf += $src[$i]; $i++
    }
    if ($buf.Length -gt 0) { $indent = $buf + "  " }
  }

  $insert = $nl + $indent + "<BuildingFolderPanel />"
  $src = $src.Insert($gt + 1, $insert)
}

# write
Set-Content -Path $page -Value $src -Encoding utf8

Write-Host "OK: Patched $($page.Replace($Root, '.'))"
Write-Host "Backup: $($backupDir.Replace($Root, '.'))\page.tsx"
Write-Host "Note : import + <BuildingFolderPanel /> added (idempotent)"
