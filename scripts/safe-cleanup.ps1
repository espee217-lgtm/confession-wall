# Safe cleanup for Confession Wall
# Removes old local dev log files only. No app source files, assets, CSS, backend, or package files are touched.

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Targets = @(
  "client/.codex-npm-start-3001.err.log",
  "client/.codex-npm-start-3001.out.log",
  "client/.codex-npm-start.err.log",
  "client/.codex-npm-start.out.log",
  "client/.mobile-pass-dev.err.log",
  "client/.mobile-pass-dev.out.log",
  "client/.shop-dev.err.log",
  "client/.shop-dev.out.log"
)

Write-Host "Confession Wall safe cleanup starting..." -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot" -ForegroundColor DarkCyan

$Removed = 0
$Missing = 0

foreach ($Target in $Targets) {
  $FullPath = Join-Path $ProjectRoot $Target
  if (Test-Path -LiteralPath $FullPath) {
    Remove-Item -LiteralPath $FullPath -Force
    Write-Host "Removed: $Target" -ForegroundColor Green
    $Removed++
  } else {
    Write-Host "Not found, skipped: $Target" -ForegroundColor DarkGray
    $Missing++
  }
}

Write-Host ""
Write-Host "Safe cleanup complete." -ForegroundColor Cyan
Write-Host "Removed files: $Removed" -ForegroundColor Green
Write-Host "Already missing/skipped: $Missing" -ForegroundColor DarkGray
Write-Host "No source code, assets, routes, CSS, backend, payments, auth, or cosmetics were modified by this script." -ForegroundColor Yellow
