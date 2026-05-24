$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$reportPath = Join-Path $root "hover-avatar-animations-pass7-1-report.txt"
$changes = New-Object System.Collections.Generic.List[string]

function Read-Text($path) {
  if (!(Test-Path $path)) { throw "Missing required file: $path" }
  return Get-Content -Path $path -Raw
}

function Write-IfChanged($path, $old, $new, $label) {
  if ($old -ne $new) {
    Set-Content -Path $path -Value $new -NoNewline
    $script:changes.Add("UPDATED  $label") | Out-Null
  } else {
    $script:changes.Add("UNCHANGED $label") | Out-Null
  }
}

$framedAvatarPath = Join-Path $root "client/src/components/FramedAvatar.js"
$postCardPath = Join-Path $root "client/src/components/PostCard.js"
$cosmeticCssPath = Join-Path $root "client/src/styles/cosmetic-animations.css"

Write-Host "Applying Pass 7.1 hover-only feed avatar/frame animations..."

# 1) FramedAvatar: add animationMode prop and class hook.
$framedOld = Read-Text $framedAvatarPath
$framedNew = $framedOld

if ($framedNew -notmatch 'animationMode\s*=') {
  $framedNew = $framedNew -replace '(className\s*=\s*"",\r?\n)', "`$1  animationMode = \"always\",`r`n"
}

if ($framedNew -notmatch 'cw-avatar-animation-hover') {
  $framedNew = $framedNew -replace '(`cw-framed-avatar--\$\{resolvedContext\}`,\r?\n)', "`$1      animationMode === \"hover\" ? \"cw-avatar-animation-hover\" : \"\",`r`n"
}

Write-IfChanged $framedAvatarPath $framedOld $framedNew "client/src/components/FramedAvatar.js"

# 2) PostCard: mark feed cards as hover hosts and make feed avatars hover-animated.
$postOld = Read-Text $postCardPath
$postNew = $postOld

if ($postNew -notmatch 'cw-feed-hover-avatar-host') {
  $postNew = $postNew -replace 'className=\{postThemeClass \|\| undefined\}', 'className={["cw-post-card", "cw-feed-hover-avatar-host", postThemeClass].filter(Boolean).join(" ")}'
}

if ($postNew -notmatch 'animationMode="hover"') {
  # Current PostCard avatar has a placeholder line. Add the prop right after it.
  $postNew = $postNew -replace '(placeholder=\{username\?\.\[0\]\?\.toUpperCase\(\) \|\| "\?"\}\r?\n)', "`$1          animationMode=\"hover\"`r`n"
}

Write-IfChanged $postCardPath $postOld $postNew "client/src/components/PostCard.js"

# 3) CSS: pause feed avatar/frame animations by default; run while hovering/focusing the feed card or avatar.
$cssOld = Read-Text $cosmeticCssPath
$cssNew = $cssOld

$cssBlock = @'

/* ── Performance: feed avatar/frame animations run only on hover ──────────────
   Used by PostCard via FramedAvatar animationMode="hover".
   Shop/settings/profile previews are untouched because they do not use this class. */
.cw-framed-avatar.cw-avatar-animation-hover,
.cw-framed-avatar.cw-avatar-animation-hover * ,
.cw-framed-avatar.cw-avatar-animation-hover::before,
.cw-framed-avatar.cw-avatar-animation-hover::after {
  animation-play-state: paused !important;
}

.cw-framed-avatar.cw-avatar-animation-hover .cw-cosmetic-fx-layer,
.cw-framed-avatar.cw-avatar-animation-hover .cw-cosmetic-fx-layer *,
.cw-framed-avatar.cw-avatar-animation-hover .cw-visor-lift-sprite-shell,
.cw-framed-avatar.cw-avatar-animation-hover .cw-visor-lift-sprite,
.cw-framed-avatar.cw-avatar-animation-hover .cw-venom-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover .cw-storm-hoodie-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover .stormHoodieGreenKeyAvatarFrame,
.cw-framed-avatar.cw-avatar-animation-hover .cw-grove-butterfly-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover .groveButterflyGreenKeyAvatarFrame,
.cw-framed-avatar.cw-avatar-animation-hover .cw-demon-thorn-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover .demonThornGreenKeyFixedAvatarFrame,
.cw-framed-avatar.cw-avatar-animation-hover .cw-lotus-aura-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover .cw-ice-monarch-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover .cw-fx-vine-svg path,
.cw-framed-avatar.cw-avatar-animation-hover .cw-fx-orbit-star {
  animation-play-state: paused !important;
  will-change: auto;
}

.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover * ,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover::before,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover::after,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover * ,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover::before,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover::after,
.cw-framed-avatar.cw-avatar-animation-hover:hover,
.cw-framed-avatar.cw-avatar-animation-hover:hover * ,
.cw-framed-avatar.cw-avatar-animation-hover:hover::before,
.cw-framed-avatar.cw-avatar-animation-hover:hover::after,
.cw-framed-avatar.cw-avatar-animation-hover:active,
.cw-framed-avatar.cw-avatar-animation-hover:active * ,
.cw-framed-avatar.cw-avatar-animation-hover:active::before,
.cw-framed-avatar.cw-avatar-animation-hover:active::after {
  animation-play-state: running !important;
}

.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover .cw-venom-frame-sprite,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover .cw-storm-hoodie-frame-sprite,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover .stormHoodieGreenKeyAvatarFrame,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover .cw-grove-butterfly-frame-sprite,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover .groveButterflyGreenKeyAvatarFrame,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover .cw-demon-thorn-frame-sprite,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover .demonThornGreenKeyFixedAvatarFrame,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover .cw-lotus-aura-frame-sprite,
.cw-feed-hover-avatar-host:hover .cw-framed-avatar.cw-avatar-animation-hover .cw-ice-monarch-frame-sprite,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover .cw-venom-frame-sprite,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover .cw-storm-hoodie-frame-sprite,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover .stormHoodieGreenKeyAvatarFrame,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover .cw-grove-butterfly-frame-sprite,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover .groveButterflyGreenKeyAvatarFrame,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover .cw-demon-thorn-frame-sprite,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover .demonThornGreenKeyFixedAvatarFrame,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover .cw-lotus-aura-frame-sprite,
.cw-feed-hover-avatar-host:focus-within .cw-framed-avatar.cw-avatar-animation-hover .cw-ice-monarch-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:hover .cw-venom-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:hover .cw-storm-hoodie-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:hover .stormHoodieGreenKeyAvatarFrame,
.cw-framed-avatar.cw-avatar-animation-hover:hover .cw-grove-butterfly-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:hover .groveButterflyGreenKeyAvatarFrame,
.cw-framed-avatar.cw-avatar-animation-hover:hover .cw-demon-thorn-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:hover .demonThornGreenKeyFixedAvatarFrame,
.cw-framed-avatar.cw-avatar-animation-hover:hover .cw-lotus-aura-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:hover .cw-ice-monarch-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:active .cw-venom-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:active .cw-storm-hoodie-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:active .stormHoodieGreenKeyAvatarFrame,
.cw-framed-avatar.cw-avatar-animation-hover:active .cw-grove-butterfly-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:active .groveButterflyGreenKeyAvatarFrame,
.cw-framed-avatar.cw-avatar-animation-hover:active .cw-demon-thorn-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:active .demonThornGreenKeyFixedAvatarFrame,
.cw-framed-avatar.cw-avatar-animation-hover:active .cw-lotus-aura-frame-sprite,
.cw-framed-avatar.cw-avatar-animation-hover:active .cw-ice-monarch-frame-sprite {
  will-change: background-position;
}
'@

if ($cssNew -notmatch 'feed avatar/frame animations run only on hover') {
  $cssNew = $cssNew.TrimEnd() + $cssBlock + "`r`n"
}

Write-IfChanged $cosmeticCssPath $cssOld $cssNew "client/src/styles/cosmetic-animations.css"

$changes | Set-Content -Path $reportPath
Write-Host "Pass 7.1 finished. Report saved to: $reportPath"
$changes | ForEach-Object { Write-Host $_ }
