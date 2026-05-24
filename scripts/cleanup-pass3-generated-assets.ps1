# cleanup-pass3-generated-assets.ps1
# Guarded cleanup for generated/duplicate cosmetic assets.
# It only deletes a target when no references are found in project source/public files.

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$ReportPath = Join-Path $Root "cleanup-pass3-report.txt"

$SearchRoots = @(
  "client/src",
  "client/public",
  "client/package.json",
  "client/package-lock.json"
)

$CandidateTargets = @(
  "client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-frames",
  "client/src/assets/avatarFrames/grove-butterfly-greenkey-frames",
  "client/src/assets/avatarFrames/storm-hoodie-greenkey-frames",
  "client/src/assets/avatarFrames/venom-screen-record-frames",
  "client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-preview.gif",
  "client/src/assets/avatarFrames/grove-butterfly-greenkey-preview.gif",
  "client/src/assets/avatarFrames/storm-hoodie-greenkey-preview.gif",
  "client/src/assets/avatarFrames/venom-screen-record-preview.gif",
  "client/src/assets/avatarFrames/demon-thorn-greenkey-fixed-sample.png",
  "client/src/assets/avatarFrames/grove-butterfly-greenkey-sample.png",
  "client/src/assets/avatarFrames/storm-hoodie-greenkey-sample.png",
  "client/src/assets/avatarFrames/venom-screen-record-sample.png",
  "client/src/assets/cosmetics/lotus-avatar-frame/transparent_frames",
  "client/src/assets/cosmetics/ice-monarch-frame/transparent_frames",
  "client/src/assets/cosmetics/lotus-avatar-frame/lotus_avatar_frame_spritesheet_49f_horizontal.png"
)

$TextExtensions = @(".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".html", ".json", ".md", ".txt")

function Write-ReportLine {
  param([string]$Line)
  Add-Content -Path $ReportPath -Value $Line
  Write-Host $Line
}

function Get-ProjectTextFiles {
  $files = New-Object System.Collections.Generic.List[string]

  foreach ($relativeRoot in $SearchRoots) {
    $absoluteRoot = Join-Path $Root $relativeRoot
    if (Test-Path $absoluteRoot -PathType Leaf) {
      $files.Add($absoluteRoot) | Out-Null
    }
    elseif (Test-Path $absoluteRoot -PathType Container) {
      Get-ChildItem -Path $absoluteRoot -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
        if ($TextExtensions -contains $_.Extension.ToLowerInvariant()) {
          $files.Add($_.FullName) | Out-Null
        }
      }
    }
  }

  return $files
}

function Convert-ToForwardSlashPath {
  param([string]$PathValue)
  return ($PathValue -replace "\\", "/")
}

function Get-ReferenceTokens {
  param([string]$RelativeTarget)

  $normalized = Convert-ToForwardSlashPath $RelativeTarget
  $name = [System.IO.Path]::GetFileName($normalized)
  $nameWithoutExt = [System.IO.Path]::GetFileNameWithoutExtension($normalized)
  $parent = Split-Path $normalized -Parent
  $parent = Convert-ToForwardSlashPath $parent

  $tokens = New-Object System.Collections.Generic.List[string]

  if ($normalized) { $tokens.Add($normalized) | Out-Null }
  if ($normalized.StartsWith("client/src/")) { $tokens.Add($normalized.Substring("client/src/".Length)) | Out-Null }
  if ($normalized.StartsWith("client/public/")) { $tokens.Add($normalized.Substring("client/public/".Length)) | Out-Null }
  if ($normalized.StartsWith("client/public")) { $tokens.Add($normalized.Substring("client/public".Length)) | Out-Null }
  if ($parent) { $tokens.Add($parent) | Out-Null }
  if ($name) { $tokens.Add($name) | Out-Null }
  if ($nameWithoutExt -and $nameWithoutExt.Length -ge 8) { $tokens.Add($nameWithoutExt) | Out-Null }

  return $tokens | Where-Object { $_ -and $_.Trim().Length -gt 0 } | Select-Object -Unique
}

function Find-References {
  param(
    [string]$RelativeTarget,
    [string[]]$TextFiles
  )

  $tokens = Get-ReferenceTokens $RelativeTarget
  $matches = New-Object System.Collections.Generic.List[string]

  foreach ($file in $TextFiles) {
    $fileRel = Convert-ToForwardSlashPath ($file.Substring($Root.Length).TrimStart([char]'\\').TrimStart([char]'/'))

    # Do not count the target itself as a reference.
    if ($fileRel -eq (Convert-ToForwardSlashPath $RelativeTarget)) { continue }
    if ($fileRel.StartsWith((Convert-ToForwardSlashPath $RelativeTarget).TrimEnd('/') + "/")) { continue }

    $content = Get-Content -Path $file -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    foreach ($token in $tokens) {
      if ($token.Length -lt 4) { continue }
      if ($content.Contains($token)) {
        $matches.Add("$fileRel -> $token") | Out-Null
        break
      }
    }
  }

  return $matches
}

"Confession Wall cleanup pass 3 report" | Set-Content -Path $ReportPath
"Generated at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Add-Content -Path $ReportPath
"Project root: $Root" | Add-Content -Path $ReportPath
"" | Add-Content -Path $ReportPath

Write-Host "Running guarded cleanup pass 3..."
Write-Host "Report will be saved to: $ReportPath"

$TextFiles = Get-ProjectTextFiles
Write-ReportLine "Scanned text files: $($TextFiles.Count)"
Write-ReportLine ""

foreach ($target in $CandidateTargets) {
  $absoluteTarget = Join-Path $Root $target
  $normalizedTarget = Convert-ToForwardSlashPath $target

  if (-not (Test-Path $absoluteTarget)) {
    Write-ReportLine "SKIP missing: $normalizedTarget"
    continue
  }

  $refs = Find-References -RelativeTarget $target -TextFiles $TextFiles

  if ($refs.Count -gt 0) {
    Write-ReportLine "SKIP referenced: $normalizedTarget"
    foreach ($ref in $refs | Select-Object -First 10) {
      Write-ReportLine "  reference: $ref"
    }
    if ($refs.Count -gt 10) {
      Write-ReportLine "  ... plus $($refs.Count - 10) more references"
    }
    continue
  }

  try {
    Remove-Item -Path $absoluteTarget -Recurse -Force
    Write-ReportLine "REMOVED unused: $normalizedTarget"
  }
  catch {
    Write-ReportLine "ERROR removing: $normalizedTarget :: $($_.Exception.Message)"
  }
}

Write-ReportLine ""
Write-ReportLine "Done. Now run: cd client; npm start"
