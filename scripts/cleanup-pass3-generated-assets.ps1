# Confession Wall cleanup pass 3
# Removes generated/duplicate frame-source assets only after checking they are not referenced by app files.
# Run from the project root: powershell -ExecutionPolicy Bypass -File ".\scripts\cleanup-pass3-generated-assets.ps1"

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$ReportPath = Join-Path $Root "cleanup-pass3-report.txt"
$Removed = New-Object System.Collections.Generic.List[string]
$Skipped = New-Object System.Collections.Generic.List[string]
$Missing = New-Object System.Collections.Generic.List[string]

$TextExtensions = @(
  ".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".html", ".json", ".md", ".txt", ".xml", ".yml", ".yaml", ".env", ".gitignore"
)

function Normalize-RelPath([string]$Path) {
  return ($Path -replace "\\", "/").TrimStart("/", "\\")
}

function Get-SearchableFiles {
  Get-ChildItem -Path $Root -Recurse -File -Force |
    Where-Object {
      $full = $_.FullName
      $rel = Normalize-RelPath($full.Substring($Root.Length))
      if ($rel -match "(^|/)node_modules(/|$)") { return $false }
      if ($rel -match "(^|/)\.git(/|$)") { return $false }
      if ($rel -match "(^|/)build(/|$)") { return $false }
      if ($rel -match "(^|/)dist(/|$)") { return $false }
      if ($rel -match "(^|/)coverage(/|$)") { return $false }
      if ($rel -eq "cleanup-pass3-report.txt") { return $false }
      return $TextExtensions -contains $_.Extension.ToLowerInvariant()
    }
}

function Test-References([string]$CandidateRel, [string[]]$Tokens) {
  $candidateNorm = Normalize-RelPath $CandidateRel
  $hits = New-Object System.Collections.Generic.List[string]
  $files = Get-SearchableFiles

  foreach ($file in $files) {
    $fileRel = Normalize-RelPath($file.FullName.Substring($Root.Length))

    # Do not count self-references inside files/folders we are deleting.
    if ($fileRel -eq $candidateNorm -or $fileRel.StartsWith($candidateNorm.TrimEnd("/") + "/")) {
      continue
    }

    $content = $null
    try {
      $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
    } catch {
      continue
    }

    foreach ($token in $Tokens) {
      if ([string]::IsNullOrWhiteSpace($token)) { continue }
      if ($content.Contains($token)) {
        $hits.Add("$fileRel -> $token") | Out-Null
      }
    }
  }
  return $hits
}

function Remove-Candidate([string]$RelPath, [string[]]$Tokens, [string]$Reason) {
  $rel = Normalize-RelPath $RelPath
  $full = Join-Path $Root $rel

  if (-not (Test-Path -LiteralPath $full)) {
    $Missing.Add("$rel | missing already") | Out-Null
    return
  }

  $hits = Test-References -CandidateRel $rel -Tokens $Tokens
  if ($hits.Count -gt 0) {
    $Skipped.Add("$rel | SKIPPED because references were found:`n  $($hits -join "`n  ")") | Out-Null
    return
  }

  Remove-Item -LiteralPath $full -Recurse -Force
  $Removed.Add("$rel | $Reason") | Out-Null
}

# Generated source-frame folders. Active app uses spritesheets, not the individual PNG frames.
Remove-Candidate "client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-frames" @("demon-thorn-greenkey-fixed-frames", "demon-thorn-greenkey-fixed-frame-001.png") "removed generated individual PNG frames; active spritesheet is kept"
Remove-Candidate "client/src/assets/avatarFrames/grove-butterfly-greenkey-frames" @("grove-butterfly-greenkey-frames", "grove-butterfly-greenkey-frame-001.png") "removed generated individual PNG frames; active spritesheet is kept"
Remove-Candidate "client/src/assets/avatarFrames/storm-hoodie-greenkey-frames" @("storm-hoodie-greenkey-frames", "storm-hoodie-greenkey-frame-001.png") "removed generated individual PNG frames; active spritesheet is kept"
Remove-Candidate "client/src/assets/avatarFrames/venom-screen-record-frames" @("venom-screen-record-frames", "venom-screen-record-frame-001.png") "removed generated individual PNG frames; active spritesheet is kept"

# Old preview/sample exports. Shop/profile animations use spritesheets through CosmeticFx.js, not these preview files.
Remove-Candidate "client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-preview.gif" @("demon-thorn-greenkey-fixed-preview.gif") "removed unused generated preview gif"
Remove-Candidate "client/src/assets/avatarFrames/grove-butterfly-greenkey-preview.gif" @("grove-butterfly-greenkey-preview.gif") "removed unused generated preview gif"
Remove-Candidate "client/src/assets/avatarFrames/storm-hoodie-greenkey-preview.gif" @("storm-hoodie-greenkey-preview.gif") "removed unused generated preview gif"
Remove-Candidate "client/src/assets/avatarFrames/venom-screen-record-preview.gif" @("venom-screen-record-preview.gif") "removed unused generated preview gif"
Remove-Candidate "client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-sample.png" @("demon-thorn-greenkey-fixed-sample.png") "removed unused generated sample image"
Remove-Candidate "client/src/assets/avatarFrames/grove-butterfly-greenkey-sample.png" @("grove-butterfly-greenkey-sample.png") "removed unused generated sample image"
Remove-Candidate "client/src/assets/avatarFrames/storm-hoodie-greenkey-sample.png" @("storm-hoodie-greenkey-sample.png") "removed unused generated sample image"

# Leftover generated transparent frame folders / duplicate layout exports.
Remove-Candidate "client/src/assets/cosmetics/lotus-avatar-frame/transparent_frames" @("lotus-avatar-frame/transparent_frames", "transparent_frames/lotus_frame_", "lotus_frame_001.png") "removed lotus individual PNG frame exports; active 7x7 spritesheet is kept"
Remove-Candidate "client/src/assets/cosmetics/ice-monarch-frame/transparent_frames" @("ice-monarch-frame/transparent_frames", "transparent_frames/ice_monarch_frame_", "ice_monarch_frame_001.png") "removed old generated Ice Monarch individual transparent frames; active 72f spritesheet is kept"
Remove-Candidate "client/src/assets/cosmetics/lotus-avatar-frame/lotus_avatar_frame_spritesheet_49f_horizontal.png" @("lotus_avatar_frame_spritesheet_49f_horizontal.png") "removed duplicate horizontal lotus spritesheet; active 7x7 spritesheet is kept"

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add("Confession Wall cleanup pass 3 report") | Out-Null
$lines.Add("Generated at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')") | Out-Null
$lines.Add("") | Out-Null
$lines.Add("Removed:") | Out-Null
if ($Removed.Count -eq 0) { $lines.Add("- None") | Out-Null } else { $Removed | ForEach-Object { $lines.Add("- $_") | Out-Null } }
$lines.Add("") | Out-Null
$lines.Add("Skipped because references were found:") | Out-Null
if ($Skipped.Count -eq 0) { $lines.Add("- None") | Out-Null } else { $Skipped | ForEach-Object { $lines.Add("- $_") | Out-Null } }
$lines.Add("") | Out-Null
$lines.Add("Already missing:") | Out-Null
if ($Missing.Count -eq 0) { $lines.Add("- None") | Out-Null } else { $Missing | ForEach-Object { $lines.Add("- $_") | Out-Null } }

$lines | Set-Content -LiteralPath $ReportPath -Encoding UTF8

Write-Host "Cleanup pass 3 complete. Report written to cleanup-pass3-report.txt" -ForegroundColor Green
Write-Host "Removed: $($Removed.Count) | Skipped: $($Skipped.Count) | Already missing: $($Missing.Count)"
if ($Skipped.Count -gt 0) {
  Write-Host "Some items were skipped because the script found references. Check cleanup-pass3-report.txt." -ForegroundColor Yellow
}
