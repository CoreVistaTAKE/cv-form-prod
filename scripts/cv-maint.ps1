# scripts\cv-maint.ps1
# CoreVista CV-FormLink メンテナンス用ユーティリティ (PowerShell 7)

param()

function New-CVProjectCopy {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$SourceRoot,
        [Parameter(Mandatory)]
        [string]$TargetRoot
    )

    if (-not (Test-Path $SourceRoot)) {
        throw "SourceRoot が存在しません: $SourceRoot"
    }
    if (Test-Path $TargetRoot) {
        throw "TargetRoot が既に存在します: $TargetRoot"
    }

    New-Item -ItemType Directory -Path $TargetRoot -Force | Out-Null

    # 不要・重いディレクトリは除外（Git, ビルド成果物, 旧バックアップなど）
    $excludeNames = @(
        ".git",
        ".next",
        "node_modules",
        "__backup",
        "_logs"
    )

    Get-ChildItem $SourceRoot -Force | Where-Object {
        $excludeNames -notcontains $_.Name
    } | ForEach-Object {
        $dst = Join-Path $TargetRoot $_.Name
        if ($_.PSIsContainer) {
            Copy-Item $_.FullName -Destination $dst -Recurse -Force
        } else {
            Copy-Item $_.FullName -Destination $dst -Force
        }
    }

    # 新バージョン側に __backup / _logs を空で作成
    New-Item -ItemType Directory -Path (Join-Path $TargetRoot "__backup") -Force | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $TargetRoot "_logs") -Force | Out-Null

    Write-Host "プロジェクトコピー完了:" -ForegroundColor Green
    Write-Host "  From: $SourceRoot"
    Write-Host "  To  : $TargetRoot"
}

function New-CVBackup {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$BasePath,
        [Parameter(Mandatory)]
        [string[]]$RelativePaths
    )

    if (-not (Test-Path $BasePath)) {
        throw "BasePath が存在しません: $BasePath"
    }

    $ts         = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupRoot = Join-Path $BasePath "__backup"
    $backupDir  = Join-Path $backupRoot $ts

    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    foreach ($rel in $RelativePaths) {
        $src = Join-Path $BasePath $rel
        if (-not (Test-Path $src)) {
            Write-Warning "バックアップ元が見つかりません: $src"
            continue
        }

        $dst    = Join-Path $backupDir $rel
        $dstDir = Split-Path $dst -Parent
        if (-not (Test-Path $dstDir)) {
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        }

        Copy-Item $src -Destination $dst -Force
    }

    Write-Host "バックアップ作成完了: $backupDir" -ForegroundColor Green
}

function Update-CVVersion {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$BasePath
    )

    $envPath = Join-Path $BasePath ".env.local"
    if (-not (Test-Path $envPath)) {
        throw ".env.local が見つかりません: $envPath"
    }

    [decimal]$curVersion  = 0
    [decimal]$nextVersion = 0
    $updated = $false

    $lines = Get-Content $envPath
    $lines = $lines | ForEach-Object {
        if ($_ -match '^NEXT_PUBLIC_APP_VERSION=v(?<ver>\d+\.\d+)$') {
            $curVersion  = [decimal]$Matches['ver']
            $nextVersion = $curVersion + 0.01m
            $updated     = $true
            "NEXT_PUBLIC_APP_VERSION=v$($nextVersion.ToString('0.00'))"
        }
        else {
            $_
        }
    }

    if (-not $updated) {
        throw "NEXT_PUBLIC_APP_VERSION の行が .env.local に見つかりませんでした。"
    }

    Set-Content $envPath -Value $lines -Encoding UTF8

    Write-Host (
        "NEXT_PUBLIC_APP_VERSION: v{0} → v{1}" -f `
        $curVersion.ToString("0.00"), `
        $nextVersion.ToString("0.00")
    ) -ForegroundColor Green
}

function Invoke-CVChange {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$BasePath,
        [Parameter(Mandatory)]
        [string[]]$RelativePaths
    )

    # 1. 変更予定ファイルだけバックアップ
    New-CVBackup -BasePath $BasePath -RelativePaths $RelativePaths
    # 2. バージョンを 0.01 上げる
    Update-CVVersion -BasePath $BasePath
}

Write-Host "cv-maint.ps1 読み込み完了。" -ForegroundColor Cyan
Write-Host "利用可能な関数: New-CVProjectCopy, New-CVBackup, Update-CVVersion, Invoke-CVChange" -ForegroundColor Cyan