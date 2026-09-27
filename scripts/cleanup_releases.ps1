# 이전 릴리스·태그 정리 (한 번만 실행). 최신 목록 릴리스(catalog-2026-09-28.11)와 main 브랜치는 건드리지 않는다.
$ErrorActionPreference = 'Continue'
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { $env:Path = "$env:ProgramFiles\GitHub CLI;$env:Path" }
Set-Location (Split-Path -Parent $PSScriptRoot)
$tags = @('v0.1.0','v0.1.1','v0.1.2','v0.1.3','v0.1.4','v0.1.5','v0.1.6',
  'catalog-2026-09-25.1','catalog-2026-09-27.1','catalog-2026-09-27.2','catalog-2026-09-27.3','catalog-2026-09-27.4',
  'catalog-2026-09-27.5','catalog-2026-09-27.6','catalog-2026-09-28.1','catalog-2026-09-28.5','catalog-2026-09-28.8')
foreach ($t in $tags) {
  gh release delete $t --yes --cleanup-tag 2>$null
  if ($LASTEXITCODE -eq 0) { Write-Output "deleted release+tag $t" } else { git push origin ":refs/tags/$t" 2>$null; Write-Output "release absent, tag removed: $t" }
  git tag -d $t 2>$null | Out-Null
}
Write-Output '--- remaining releases'; gh release list
Write-Output '--- remaining remote tags'; git ls-remote --tags origin
