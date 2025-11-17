# Hotfix: /user-builder で "default export is not a React Component" を出す原因の
# UBHeader / UserBuilderPanels の import と JSX を一時的に無効化するだけのパッチ
# - 最小差分、UI/文言/並びは変更しない
# - PowerShell 5 互換
# - UTF8 (No BOM) で保存
# - 自動バックアップ: __backup\hotfix_user_builder_yyyyMMdd_HHmmss

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ルート解決（スクリプトとして実行前提。$PSScriptRoot が無い場面の保険）
$scriptPath = $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($scriptPath)) {
  throw "このスクリプトは -File で実行してください。"
}
$root = Split-Path -Parent $scriptPath
$root = Split-Path -Parent $root  # scripts の親＝プロジェクト直下

# 対象ファイル
$target = Join-Path $root "app\user-builder\page.tsx"
if (-not (Test-Path $target)) { throw "Target not found: $target" }

# バックアップ
$bakDir = Join-Path $root ("__backup\hotfix_user_builder_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -ItemType Directory -Force -Path $bakDir | Out-Null
Copy-Item -LiteralPath $target -Destination $bakDir

# 読み込み（無BOMで再保存するため .NET API を使用）
$src = [System.IO.File]::ReadAllText($target)

# 先頭に 'use client' が無ければ付与（既にあれば何もしない）
if ($src -notmatch "^\s*('use client'|""use client"")") {
  $src = "'use client';`r`n" + $src
}

# 1) 不正コンポーネントの import 行を削除
$src = [System.Text.RegularExpressions.Regex]::Replace(
  $src, "^\s*import\s+UBHeader\b[^\r\n]*\r?\n", "", [System.Text.RegularExpressions.RegexOptions]::Multiline
)
$src = [System.Text.RegularExpressions.Regex]::Replace(
  $src, "^\s*import\s+UserBuilderPanels\b[^\r\n]*\r?\n", "", [System.Text.RegularExpressions.RegexOptions]::Multiline
)

# 2) JSX 呼び出しを削除（<UBHeader /> / <UserBuilderPanels />）
$src = [System.Text.RegularExpressions.Regex]::Replace(
  $src, "<\s*UBHeader\s*/\s*>", "", [System.Text.RegularExpressions.RegexOptions]::Singleline
)
$src = [System.Text.RegularExpressions.Regex]::Replace(
  $src, "<\s*UserBuilderPanels\s*/\s*>", "", [System.Text.RegularExpressions.RegexOptions]::Singleline
)

# 保存（UTF8 No BOM）
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $src, $utf8NoBom)

Write-Host "DONE: hotfix applied to" $target
Write-Host "Backup:" $bakDir
