$ErrorActionPreference = "Stop"

$Root = (Resolve-Path ".").Path

function Join-ProjectPath([string]$RelativePath) {
  return Join-Path $Root $RelativePath
}

function Read-Text([string]$RelativePath) {
  $Path = Join-ProjectPath $RelativePath
  if (!(Test-Path $Path)) {
    throw "Missing required file: $RelativePath"
  }
  return Get-Content -Path $Path -Raw
}

function Write-Text([string]$RelativePath, [string]$Content) {
  $Path = Join-ProjectPath $RelativePath
  Set-Content -Path $Path -Value $Content -NoNewline -Encoding UTF8
}

function Replace-Once([string]$Text, [string]$Old, [string]$New, [string]$Label) {
  $Index = $Text.IndexOf($Old)
  if ($Index -lt 0) {
    throw "Could not find expected text while patching: $Label"
  }
  return $Text.Substring(0, $Index) + $New + $Text.Substring($Index + $Old.Length)
}

Write-Host "Applying hover-only feed avatar animation patch..."

# 1) FramedAvatar: add animationMode prop and hover class support.
$FramedPath = "client/src/components/FramedAvatar.js"
$Framed = Read-Text $FramedPath

if ($Framed -notmatch 'animationMode\s*=') {
  $Old = "  className = `"`",`n})"
  $New = "  className = `"`",`n  animationMode = `"always`",`n})"
  if ($Framed.Contains($Old)) {
    $Framed = $Framed.Replace($Old, $New)
  } else {
    $Old = "  className = `"`",`r`n})"
    $New = "  className = `"`",`r`n  animationMode = `"always`",`r`n})"
    if ($Framed.Contains($Old)) {
      $Framed = $Framed.Replace($Old, $New)
    } else {
      throw "Could not add animationMode prop in $FramedPath"
    }
  }
}

if ($Framed -notmatch 'cw-avatar-animation-hover') {
  $Old = "      className,`n      frameAnimClass,"
  $New = "      className,`n      animationMode === `"hover`" ? `"cw-avatar-animation-hover`" : `"`",`n      frameAnimClass,"
  if ($Framed.Contains($Old)) {
    $Framed = $Framed.Replace($Old, $New)
  } else {
    $Old = "      className,`r`n      frameAnimClass,"
    $New = "      className,`r`n      animationMode === `"hover`" ? `"cw-avatar-animation-hover`" : `"`",`r`n      frameAnimClass,"
    if ($Framed.Contains($Old)) {
      $Framed = $Framed.Replace($Old, $New)
    } else {
      throw "Could not add hover animation class in $FramedPath"
    }
  }
}

Write-Text $FramedPath $Framed
Write-Host "Updated $FramedPath"

# 2) PostCard: mark feed cards and make their avatar animation hover-only.
$PostCardPath = "client/src/components/PostCard.js"
$PostCard = Read-Text $PostCardPath

if ($PostCard -notmatch 'cw-feed-post-card') {
  $PostCard = $PostCard.Replace('className={postThemeClass || undefined}', 'className={["cw-feed-post-card", postThemeClass].filter(Boolean).join(" ")}')
  if ($PostCard -notmatch 'cw-feed-post-card') {
    throw "Could not add cw-feed-post-card class in $PostCardPath"
  }
}

if ($PostCard -notmatch 'animationMode="hover"') {
  $Old = '          placeholder={username?.[0]?.toUpperCase() || "?"}' + "`n"
  $New = '          placeholder={username?.[0]?.toUpperCase() || "?"}' + "`n" + '          animationMode="hover"' + "`n"
  if ($PostCard.Contains($Old)) {
    $PostCard = $PostCard.Replace($Old, $New)
  } else {
    $Old = '          placeholder={username?.[0]?.toUpperCase() || "?"}' + "`r`n"
    $New = '          placeholder={username?.[0]?.toUpperCase() || "?"}' + "`r`n" + '          animationMode="hover"' + "`r`n"
    if ($PostCard.Contains($Old)) {
      $PostCard = $PostCard.Replace($Old, $New)
    } else {
      throw "Could not add animationMode=hover to FramedAvatar in $PostCardPath"
    }
  }
}

Write-Text $PostCardPath $PostCard
Write-Host "Updated $PostCardPath"

# 3) CSS: pause only feed avatar cosmetics by default, resume on hover/focus/active.
$CssPath = "client/src/styles/cosmetic-animations.css"
$Css = Read-Text $CssPath

$CssBlock = @'

/* Pass 7.1: feed avatar/frame cosmetics animate only on interaction.
   Shop, settings, profile, and navbar previews are not affected unless they opt into
   .cw-avatar-animation-hover. */
.cw-feed-post-card .cw-avatar-animation-hover,
.cw-feed-post-card .cw-avatar-animation-hover::before,
.cw-feed-post-card .cw-avatar-animation-hover::after,
.cw-feed-post-card .cw-avatar-animation-hover *,
.cw-feed-post-card .cw-avatar-animation-hover *::before,
.cw-feed-post-card .cw-avatar-animation-hover *::after {
  animation-play-state: paused !important;
}

.cw-feed-post-card:hover .cw-avatar-animation-hover,
.cw-feed-post-card:hover .cw-avatar-animation-hover::before,
.cw-feed-post-card:hover .cw-avatar-animation-hover::after,
.cw-feed-post-card:hover .cw-avatar-animation-hover *,
.cw-feed-post-card:hover .cw-avatar-animation-hover *::before,
.cw-feed-post-card:hover .cw-avatar-animation-hover *::after,
.cw-feed-post-card:focus-within .cw-avatar-animation-hover,
.cw-feed-post-card:focus-within .cw-avatar-animation-hover::before,
.cw-feed-post-card:focus-within .cw-avatar-animation-hover::after,
.cw-feed-post-card:focus-within .cw-avatar-animation-hover *,
.cw-feed-post-card:focus-within .cw-avatar-animation-hover *::before,
.cw-feed-post-card:focus-within .cw-avatar-animation-hover *::after,
.cw-avatar-animation-hover:hover,
.cw-avatar-animation-hover:hover::before,
.cw-avatar-animation-hover:hover::after,
.cw-avatar-animation-hover:hover *,
.cw-avatar-animation-hover:hover *::before,
.cw-avatar-animation-hover:hover *::after,
.cw-avatar-animation-hover:active,
.cw-avatar-animation-hover:active::before,
.cw-avatar-animation-hover:active::after,
.cw-avatar-animation-hover:active *,
.cw-avatar-animation-hover:active *::before,
.cw-avatar-animation-hover:active *::after {
  animation-play-state: running !important;
}
'@

if ($Css -notmatch 'Pass 7\.1: feed avatar/frame cosmetics animate only on interaction') {
  $Css = $Css.TrimEnd() + $CssBlock + "`n"
}

Write-Text $CssPath $Css
Write-Host "Updated $CssPath"

Write-Host "Hover-only feed avatar animation patch applied successfully."
