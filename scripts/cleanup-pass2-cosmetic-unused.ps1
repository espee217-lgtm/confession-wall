# Confession Wall cosmetic cleanup pass 2
# Removes unused standalone frame CSS and duplicate/source cosmetic assets.
# Run from project root: C:\Users\espee\OneDrive\Desktop\confession-wall

$ErrorActionPreference = "Stop"

Write-Host "Confession Wall cleanup pass 2 starting..." -ForegroundColor Cyan

$projectRoot = (Get-Location).Path
$removedCount = 0
$missingCount = 0

$targets = @(
  "client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-frame.css",
  "client/src/assets/avatarFrames/grove-butterfly-greenkey-frame.css",
  "client/src/assets/avatarFrames/storm-hoodie-greenkey-frame.css",
  "client/src/assets/avatarFrames/venom-screen-record-frame.css",
  "client/src/assets/cosmetics/lotus-avatar-frame/lotus_avatar_frame_spritesheet_49f_horizontal.png",
  "client/src/assets/cosmetics/ice-monarch-frame/transparent_frames"
)

foreach ($relativePath in $targets) {
  $fullPath = Join-Path $projectRoot $relativePath
  if (Test-Path $fullPath) {
    Write-Host "Removing: $relativePath" -ForegroundColor Yellow
    Remove-Item -LiteralPath $fullPath -Recurse -Force
    $removedCount++
  } else {
    Write-Host "Already missing / skipped: $relativePath" -ForegroundColor DarkGray
    $missingCount++
  }
}

Write-Host "Cleanup pass 2 complete." -ForegroundColor Green
Write-Host "Removed targets: $removedCount"
Write-Host "Skipped missing targets: $missingCount"
Write-Host "Lotus metadata was updated by the extracted patch to stop referencing the removed horizontal spritesheet." -ForegroundColor Cyan
Write-Host "Now run: cd client ; npm start" -ForegroundColor Cyan
