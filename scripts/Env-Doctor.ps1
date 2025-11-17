param(
  [string]$SetSaveFiles = "",
  [string]$SetGetNextSeq = "",
  [string]$SetCreateFormFolder = "",
  [switch]$FixEncoding
)

$ErrorActionPreference = 'Stop'

# 1) 繝励Ο繧ｸ繧ｧ繧ｯ繝育峩荳九・迚ｹ螳夲ｼ井ｸ贋ｽ・髫主ｱ､縺ｾ縺ｧ・・
function Find-ProjectRoot {
  $start = $PSScriptRoot
  if ([string]::IsNullOrWhiteSpace($start)) { $start = (Get-Location).Path }
  $dir = Get-Item $start
  for($i=0; $i -lt 6; $i++){
    $pkg = Join-Path $dir.FullName "package.json"
    $layout = Join-Path $dir.FullName "app\layout.tsx"
    if ((Test-Path $pkg) -and (Test-Path $layout)) { return $dir.FullName }
    $parent = $dir.Parent
    if (-not $parent) { break }
    $dir = $parent
  }
  return (Get-Location).Path
}

$root = Find-ProjectRoot
$envPath = Join-Path $root ".env.local"
Write-Host ("Project root: " + $root)
Write-Host ("Env file    : " + $envPath)

# 2) 隱ｭ縺ｿ霎ｼ縺ｿ・・OM髯､蜴ｻ・・
function Read-NoBomText([string]$path){
  if (-not (Test-Path $path)) { return $null }
  [byte[]]$b = [IO.File]::ReadAllBytes($path)
  $hadBOM = $false
  if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
    $b = $b[3..($b.Length-1)]
    $hadBOM = $true
  }
  $txt = [Text.Encoding]::UTF8.GetString($b)
  return @{ text=$txt; hadBOM=$hadBOM }
}
function Write-Utf8NoBom([string]$path,[string]$text){
  $enc = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($path, $text, $enc)
}

$existing = Read-NoBomText $envPath
if ($existing -ne $null) {
  if ($existing.hadBOM) {
    if ($FixEncoding) {
      Write-Utf8NoBom $envPath $existing.text
      Write-Host "BOM 繧貞炎髯､縺励※ UTF-8 縺ｧ菫晏ｭ倥＠縺ｾ縺励◆縲・ -ForegroundColor Yellow
    } else {
      Write-Host "豕ｨ諢・ .env.local 縺ｫ UTF-8 BOM 縺御ｻ倥＞縺ｦ縺・∪縺吶ゑｼ・FixEncoding 縺ｧ蜑企勁蜿ｯ閭ｽ・・ -ForegroundColor Yellow
    }
  }
}

# 3) 逶｣譟ｻ
function Audit-Env([string]$text){
  $map = New-Object 'System.Collections.Generic.Dictionary[string,string]'
  $keys = @("FLOW_URL_SAVEFILES","FLOW_URL_GETNEXTSEQ","FLOW_URL_CREATEFORMFOLDER")
  foreach($k in $keys){ $map[$k] = "" }
  if ($text -ne $null) {
    $lines = $text -split "`r?`n"
    foreach($ln in $lines){
      $t = $ln.Trim()
      if ($t.Length -eq 0 -or $t.StartsWith("#")) { continue }
      $i = $t.IndexOf("=")
      if ($i -lt 0) { continue }
      $k = $t.Substring(0,$i).Trim()
      $v = $t.Substring($i+1).Trim()
      if ($map.ContainsKey($k)) { $map[$k] = $v }
    }
  }
  return $map
}
function Is-HttpsUrl([string]$v){
  if ([string]::IsNullOrWhiteSpace($v)) { return $false }
  if ($v -match "\s") { return $false }
  if (-not ($v -match "^https://")) { return $false }
  try { $u = [Uri]$v; return ($u.Scheme -eq "https") } catch { return $false }
}

$vals = $null
if ($existing -ne $null) { $vals = Audit-Env $existing.text }

if ($vals -ne $null) {
  Write-Host "=== 迴ｾ蝨ｨ縺ｮ .env.local ===" -ForegroundColor Cyan
  foreach($k in $vals.Keys){
    $v = $vals[$k]
    if ($v -eq "") {
      Write-Host ("NG: {0} 縺梧悴險ｭ螳・ -f $k) -ForegroundColor Red
    } else {
      $ok = Is-HttpsUrl $v
      if ($ok) {
        Write-Host ("OK: {0} = {1}" -f $k,$v) -ForegroundColor Green
      } else {
        Write-Host ("NG: {0} = {1}" -f $k,$v) -ForegroundColor Red
      }
    }
  }
} else {
  Write-Host "迴ｾ蝨ｨ .env.local 縺ｯ蟄伜惠縺励∪縺帙ｓ・育屮譟ｻ縺ｮ縺ｿ・・ -ForegroundColor Yellow
}

# 4) 菴懈・/譖ｴ譁ｰ・域欠螳壹＆繧後◆縺ｨ縺阪□縺托ｼ・
$wantWrite = ($SetSaveFiles -ne "" -and $SetGetNextSeq -ne "" -and $SetCreateFormFolder -ne "")
if ($wantWrite) {
  if (-not (Is-HttpsUrl $SetSaveFiles))        { Write-Host "ERROR: -SetSaveFiles 縺ｯ https:// 縺ｧ蟋九∪繧・1 陦袈RL縺ｫ縺励※縺上□縺輔＞" -ForegroundColor Red; return }
  if (-not (Is-HttpsUrl $SetGetNextSeq))       { Write-Host "ERROR: -SetGetNextSeq 縺ｯ https:// 縺ｧ蟋九∪繧・1 陦袈RL縺ｫ縺励※縺上□縺輔＞"  -ForegroundColor Red; return }
  if (-not (Is-HttpsUrl $SetCreateFormFolder)) { Write-Host "ERROR: -SetCreateFormFolder 縺ｯ https:// 縺ｧ蟋九∪繧・1 陦袈RL縺ｫ縺励※縺上□縺輔＞" -ForegroundColor Red; return }

  $bkDir = Join-Path $root ("__backup\env_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
  New-Item -ItemType Directory -Path $bkDir -Force | Out-Null
  if (Test-Path $envPath) { Copy-Item $envPath (Join-Path $bkDir ".env.local") -Force }

  $lines = @()
  $lines += "FLOW_URL_SAVEFILES=" + $SetSaveFiles
  $lines += "FLOW_URL_GETNEXTSEQ=" + $SetGetNextSeq
  $lines += "FLOW_URL_CREATEFORMFOLDER=" + $SetCreateFormFolder
  $outText = [string]::Join([Environment]::NewLine, $lines) + [Environment]::NewLine
  Write-Utf8NoBom $envPath $outText

  Write-Host "譖ｸ縺崎ｾｼ縺ｿ螳御ｺ・ .env.local 繧・UTF-8(BOM縺ｪ縺・ 縺ｧ菫晏ｭ倥＠縺ｾ縺励◆縲・ -ForegroundColor Green
  Write-Host "dev繧ｵ繝ｼ繝舌ｒ蜀崎ｵｷ蜍輔＠縺ｦ縺上□縺輔＞・・pm run dev 繧貞・螳溯｡鯉ｼ峨・ -ForegroundColor Yellow
} else {
  Write-Host "・井ｽ懈・/譖ｴ譁ｰ縺ｯ譛ｪ螳溯｡後・SetSaveFiles/-SetGetNextSeq/-SetCreateFormFolder 繧貞・縺ｦ謖・ｮ壹☆繧九→譖ｸ縺崎ｾｼ縺ｿ縺ｾ縺呻ｼ・ -ForegroundColor DarkGray
}
