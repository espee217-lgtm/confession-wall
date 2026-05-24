<#
Guarded cleanup pass 3 for Confession Wall.
This script removes only old generated asset leftovers when no text references are found in project source files.
It is intentionally conservative and writes cleanup-pass3-report.txt at the project root.
#>

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path (Join-Path $ScriptDir "..")
$ReportPath = Join-Path $Root "cleanup-pass3-report.txt"

$TextExtensions = @(".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".html", ".json", ".md")
$ExcludedDirs = @("node_modules", "build", ".git", ".cache", "dist")

function Test-IsExcludedPath {
  param([string]$Path)
  $parts = $Path -split "[\\/]"
  foreach ($part in $parts) {
    if ($ExcludedDirs -contains $part) { return $true }
  }
  return $false
}

function Convert-ToForwardSlashPath {
  param([string]$Path)
  return ($Path -replace "\\", "/")
}

function Get-RelativeForwardPath {
  param([string]$FullPath)
  $rootFull = [System.IO.Path]::GetFullPath($Root)
  $targetFull = [System.IO.Path]::GetFullPath($FullPath)

  if ($targetFull.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    $relative = $targetFull.Substring($rootFull.Length).TrimStart([char]'\\', [char]'/')
    return Convert-ToForwardSlashPath $relative
  }

  return Convert-ToForwardSlashPath $targetFull
}

function Get-TextFiles {
  Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
      -not (Test-IsExcludedPath $_.FullName) -and
      ($TextExtensions -contains $_.Extension.ToLowerInvariant())
    }
}

function Test-TokenReferenced {
  param(
    [string[]]$Tokens,
    [object[]]$TextFiles
  )

  $cleanTokens = $Tokens |
    Where-Object { $_ -and $_.Trim().Length -gt 2 } |
    Select-Object -Unique

  foreach ($file in $TextFiles) {
    $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { continue }

    foreach ($token in $cleanTokens) {
      if ($content.IndexOf($token, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
        return @{ Referenced = $true; File = (Get-RelativeForwardPath $file.FullName); Token = $token }
      }
    }
  }

  return @{ Referenced = $false; File = ""; Token = "" }
}

function Get-CandidateTokens {
  param([string]$CandidatePath)

  $tokens = New-Object System.Collections.Generic.List[string]
  $leaf = Split-Path -Leaf $CandidatePath
  $relative = Get-RelativeForwardPath $CandidatePath
  $tokens.Add($leaf)
  $tokens.Add($relative)

  if (Test-Path -LiteralPath $CandidatePath -PathType Leaf) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($CandidatePath)
    $tokens.Add($base)
  }

  if (Test-Path -LiteralPath $CandidatePath -PathType Container) {
    $tokens.Add($leaf.TrimEnd('/'))
    Get-ChildItem -Path $CandidatePath -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
      $tokens.Add($_.Name)
      $tokens.Add([System.IO.Path]::GetFileNameWithoutExtension($_.Name))
      $tokens.Add((Get-RelativeForwardPath $_.FullName))
    }
  }

  return $tokens.ToArray() | Select-Object -Unique
}

$CandidateRelativePaths = @(
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

$Report = New-Object System.Collections.Generic.List[string]
$Report.Add("Confession Wall cleanup pass 3 report")
$Report.Add("Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$Report.Add("Project root: $Root")
$Report.Add("")
$Report.Add("Running guarded cleanup pass 3...")

$TextFiles = @(Get-TextFiles)
$Report.Add("Scanned text files: $($TextFiles.Count)")
$Report.Add("")

$Removed = 0
$SkippedReferenced = 0
$SkippedMissing = 0

foreach ($rel in $CandidateRelativePaths) {
  $candidate = Join-Path $Root $rel
  $display = Convert-ToForwardSlashPath $rel

  if (-not (Test-Path -LiteralPath $candidate)) {
    $SkippedMissing++
    $Report.Add("MISSING  : $display")
    continue
  }

  $tokens = @(Get-CandidateTokens $candidate)
  $refResult = Test-TokenReferenced -Tokens $tokens -TextFiles $TextFiles

  if ($refResult.Referenced) {
    $SkippedReferenced++
    $Report.Add("SKIPPED  : $display")
    $Report.Add("           reason: reference found in $($refResult.File)")
    $Report.Add("           token : $($refResult.Token)")
    continue
  }

  Remove-Item -LiteralPath $candidate -Recurse -Force
  $Removed++
  $Report.Add("REMOVED  : $display")
}

$Report.Add("")
$Report.Add("Summary:")
$Report.Add("Removed: $Removed")
$Report.Add("Skipped because referenced: $SkippedReferenced")
$Report.Add("Skipped because missing: $SkippedMissing")
$Report.Add("")
$Report.Add("Active spritesheets intentionally not targeted:")
$Report.Add("- client/src/assets/cosmetics/ice-monarch-frame/ice_monarch_avatar_frame_spritesheet_72f_8x9.png")
$Report.Add("- client/src/assets/cosmetics/lotus-avatar-frame/lotus_avatar_frame_spritesheet_49f_7x7.png")
$Report.Add("- client/src/assets/avatarFrames/*-spritesheet.png")

$Report | Set-Content -Path $ReportPath -Encoding UTF8

Write-Host "Guarded cleanup pass 3 complete."
Write-Host "Report saved to: $ReportPath"
Write-Host "Removed: $Removed"
Write-Host "Skipped because referenced: $SkippedReferenced"
Write-Host "Skipped because missing: $SkippedMissing"
