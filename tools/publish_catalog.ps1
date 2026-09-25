# 목록(catalog) 발행: export → GitHub Release(catalog-<ver>) 업로드 → catalog/manifest.json 커밋·푸시
# 사용: .\tools\publish_catalog.ps1 [-Version 2026-09-25.2] [-Repo user/kpop-search-tools] [-Db path\to\songs.db]
# 사전: winget install GitHub.cli ; gh auth login ; 저장소가 origin 으로 연결되어 있을 것
param(
  [string]$Version,
  [string]$Repo,
  [string]$Db
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $Repo) {
  $origin = git remote get-url origin
  if ($origin -match 'github\.com[:/]([^/]+/[^/.]+)') { $Repo = $Matches[1] } else { throw 'origin 이 GitHub 저장소가 아닙니다. -Repo user/repo 를 지정하세요.' }
}
$args = @('tools/export_catalog.py', '--install', '--repo', $Repo)
if ($Version) { $args += @('--version', $Version) }
if ($Db) { $args += @('--db', $Db) }
$env:PYTHONIOENCODING = 'utf-8'
$result = python @args | ConvertFrom-Json
$ver = $result.version
$count = $result.main
Write-Output "exported $ver : $count 곡 (gz $($result.gz_bytes) bytes)"

$prev = Get-Content 'catalog/manifest.json' -Raw | ConvertFrom-Json
if ($prev.count -and [math]::Abs($count - $prev.count) -gt [math]::Max(500, $prev.count * 0.1)) {
  Write-Warning "곡 수가 이전($($prev.count))과 크게 다릅니다: $count. 계속하려면 아무 키나 누르세요."
  [void][System.Console]::ReadKey($true)
}

$tag = "catalog-$ver"
git tag $tag
git push origin $tag
gh release create $tag 'out/catalog/catalog.json.gz' 'out/catalog/manifest.json' --repo $Repo --title "Catalog $ver" --notes "노래 제목 목록 $count 곡" --latest=false
if ($LASTEXITCODE -ne 0) { throw 'gh release create failed' }

# 올라간 파일 검증
$manifest = Get-Content 'out/catalog/manifest.json' -Raw | ConvertFrom-Json
$tmp = Join-Path $env:TEMP 'catalog-check.gz'
Invoke-WebRequest -Uri $manifest.url -OutFile $tmp -UseBasicParsing
$hash = (Get-FileHash $tmp -Algorithm SHA256).Hash.ToLower()
if ($hash -ne $manifest.sha256) { throw "업로드된 파일 sha256 불일치: $hash" }
Write-Output "release asset verified: $($manifest.url)"

Copy-Item 'out/catalog/manifest.json' 'catalog/manifest.json' -Force
git add catalog/manifest.json src-tauri/resources/catalog.json.gz
git commit -m "catalog $ver ($count 곡)"
git push
Write-Output "done: 앱은 다음 실행(또는 '목록 업데이트 확인') 때 $ver 로 갱신됩니다."
