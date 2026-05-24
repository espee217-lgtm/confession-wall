$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$ReportPath = Join-Path $Root "cleanup-pass6-5-report.txt"

$CodeExtensions = @("*.js", "*.jsx", "*.ts", "*.tsx", "*.css", "*.scss", "*.html", "*.json", "*.md")
$IgnoreDirs = @("node_modules", ".git", "build", "dist", ".next", "coverage")

$Candidates = @(
  "client/public/forest.png",
  "client/public/confession-logo.png",
  "client/public/krishna.png",
  "client/public/Demon.png",
  "client/public/reena-choice/forest-bg.png",
  "client/public/reena-choice/MainSiteStone.png",
  "client/public/reena-choice/SpecialSectionStone.png",
  "client/public/reena/GRC.png",
  "client/public/reena-kundali/infographics1.png",
  "client/public/reena-kundali/infographics2.png",
  "client/public/reena-kundali/infographics3.png",
  "client/public/reena-kundali/infographics4.png",
  "client/public/reena-kundali/infographics5.png",
  "client/public/reena-kundali/infographics6.png",
  "client/public/reena-kundali/infographics7.png",
  "client/public/reena-kundali/infographics8.png",
  "client/src/assets/forest-page-bg.png",
  "client/src/assets/mobile-navbar-bg.png"
)

function Write-ReportLine {
  param([string]$Line)
  $Line | Tee-Object -FilePath $ReportPath -Append
}

function Is-InIgnoredDir {
  param([string]$Path)
  $normalized = $Path.Replace("/", "\\")
  foreach ($dir in $IgnoreDirs) {
    if ($normalized -match "(^|\\)$([regex]::Escape($dir))(\\|$)") {
      return $true
    }
  }
  return $false
}

function Get-CodeFiles {
  $all = @()
  foreach ($ext in $CodeExtensions) {
    $files = Get-ChildItem -Path $Root -Recurse -File -Include $ext -ErrorAction SilentlyContinue |
      Where-Object { -not (Is-InIgnoredDir $_.FullName) }
    $all += $files
  }
  return $all | Sort-Object FullName -Unique
}

function Test-ReferenceFound {
  param(
    [string]$FileName,
    [string]$CandidateRelPath,
    [object[]]$CodeFiles
  )

  $slashPath = $CandidateRelPath.Replace("\\", "/")
  $publicPath = $slashPath
  if ($slashPath.StartsWith("client/public/")) {
    $publicPath = "/" + $slashPath.Substring("client/public/".Length)
  }
  $srcTail = $slashPath
  if ($slashPath.StartsWith("client/src/")) {
    $srcTail = $slashPath.Substring("client/src/".Length)
  }

  $patterns = @(
    [regex]::Escape($FileName),
    [regex]::Escape($slashPath),
    [regex]::Escape($publicPath),
    [regex]::Escape($srcTail)
  ) | Sort-Object -Unique

  foreach ($file in $CodeFiles) {
    try {
      $text = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
    } catch {
      continue
    }

    foreach ($pattern in $patterns) {
      if ($text -match $pattern) {
        return $true
      }
    }
  }
  return $false
}

if (Test-Path $ReportPath) {
  Remove-Item $ReportPath -Force
}

Write-ReportLine "Cleanup Pass 6.5 - Unused PNG fallback cleanup"
Write-ReportLine "Started: $(Get-Date)"
Write-ReportLine "Project root: $Root"
Write-ReportLine ""
Write-ReportLine "This script removes only PNG candidates that have a sibling .webp file and no detected project reference."
Write-ReportLine "If a PNG is still referenced as fallback in CSS/JS/JSON/HTML/MD, it is skipped."
Write-ReportLine ""

$CodeFiles = Get-CodeFiles
Write-ReportLine "Scanned code/reference files: $($CodeFiles.Count)"
Write-ReportLine ""

$Removed = 0
$Skipped = 0
$Missing = 0

foreach ($rel in $Candidates) {
  $full = Join-Path $Root $rel
  $webpFull = [System.IO.Path]::ChangeExtension($full, ".webp")
  $fileName = [System.IO.Path]::GetFileName($full)

  if (-not (Test-Path -LiteralPath $full)) {
    Write-ReportLine "MISSING  $rel"
    $Missing++
    continue
  }

  if (-not (Test-Path -LiteralPath $webpFull)) {
    Write-ReportLine "SKIPPED  $rel  | no sibling .webp found"
    $Skipped++
    continue
  }

  $referenced = Test-ReferenceFound -FileName $fileName -CandidateRelPath $rel -CodeFiles $CodeFiles
  if ($referenced) {
    Write-ReportLine "SKIPPED  $rel  | still referenced in project"
    $Skipped++
    continue
  }

  try {
    $size = (Get-Item -LiteralPath $full).Length
    Remove-Item -LiteralPath $full -Force
    $savedMb = [math]::Round($size / 1MB, 2)
    Write-ReportLine "REMOVED  $rel  | saved ${savedMb} MB"
    $Removed++
  } catch {
    Write-ReportLine "ERROR    $rel  | $($_.Exception.Message)"
    $Skipped++
  }
}

Write-ReportLine ""
Write-ReportLine "Finished: $(Get-Date)"
Write-ReportLine "Removed: $Removed"
Write-ReportLine "Skipped: $Skipped"
Write-ReportLine "Missing: $Missing"
Write-ReportLine ""
Write-ReportLine "Next checks: run the app, verify key pages, then npm run build."
Write-Host "Cleanup pass 6.5 finished. Open cleanup-pass6-5-report.txt for details."
