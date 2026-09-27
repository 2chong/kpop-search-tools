# 설치 파일 빌드: npm run tauri build → release\KpopSearchTools-Setup.exe 로 복사하고 크기·SHA-256 출력
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path" }

$ErrorActionPreference = 'Continue'   # npm/cargo 는 진행 정보를 stderr 로 쓰므로 종료 코드로만 판단
cmd /c "npm run tauri build"
$code = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($code -ne 0) { throw 'tauri build failed' }

$conf = Get-Content (Join-Path $root 'src-tauri\tauri.conf.json') -Raw | ConvertFrom-Json
$ver = $conf.version
$src = Get-ChildItem (Join-Path $root 'src-tauri\target\release\bundle\nsis') -Filter '*-setup.exe' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $src) { throw 'installer not found' }
$outDir = Join-Path $root 'release'
New-Item -ItemType Directory -Force $outDir | Out-Null
$dst = Join-Path $outDir 'KpopSearchTools-Setup.exe'
Copy-Item $src.FullName $dst -Force
$hash = (Get-FileHash $dst -Algorithm SHA256).Hash.ToLower()
$size = [math]::Round((Get-Item $dst).Length / 1MB, 2)
"$hash  KpopSearchTools-Setup.exe  v$ver  ${size}MB" | Set-Content (Join-Path $outDir 'SHA256SUMS.txt') -Encoding utf8
Write-Output "installer: $dst"
Write-Output "version : $ver"
Write-Output "size    : ${size} MB"
Write-Output "sha256  : $hash"
