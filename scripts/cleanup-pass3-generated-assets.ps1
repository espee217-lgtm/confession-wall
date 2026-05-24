# Confession Wall guarded cleanup pass 3 - fixed no path helper version
# Safe behavior:
# - Scans project text files first.
# - Removes only listed generated/duplicate candidates when no reference is found.
# - Writes cleanup-pass3-report.txt in project root.

$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$ReportPath = Join-Path $Root "cleanup-pass3-report.txt"

function Write-ReportLine {
    param([string]$Line)
    Add-Content -Path $ReportPath -Value $Line -Encoding UTF8
    Write-Host $Line
}

function Normalize-Slash {
    param([string]$Value)
    return ($Value -replace '\\', '/')
}

function Get-CandidateTokens {
    param([string]$CandidateRelativePath)

    $slashPath = Normalize-Slash $CandidateRelativePath
    $fileName = [System.IO.Path]::GetFileName($CandidateRelativePath)
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($CandidateRelativePath)

    $tokens = New-Object System.Collections.Generic.List[string]
    if ($slashPath) { $tokens.Add($slashPath) }
    if ($fileName) { $tokens.Add($fileName) }
    if ($baseName) { $tokens.Add($baseName) }

    # For folders, also check the folder's own name and slash path with trailing slash.
    if (-not [System.IO.Path]::HasExtension($CandidateRelativePath)) {
        $folderName = Split-Path $CandidateRelativePath -Leaf
        if ($folderName) { $tokens.Add($folderName) }
        if ($slashPath -and -not $slashPath.EndsWith('/')) { $tokens.Add($slashPath + '/') }
    }

    return $tokens | Where-Object { $_ -and $_.Trim().Length -gt 0 } | Select-Object -Unique
}

function Test-IsReferenced {
    param([string]$CandidateRelativePath)

    $tokens = Get-CandidateTokens $CandidateRelativePath

    $textExtensions = @(
        ".js", ".jsx", ".ts", ".tsx", ".css", ".scss", ".html", ".json", ".md", ".txt", ".env", ".yml", ".yaml"
    )

    $scanFiles = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
            $full = Normalize-Slash $_.FullName
            $ext = $_.Extension.ToLowerInvariant()
            ($textExtensions -contains $ext) -and
            ($full -notmatch '/node_modules/') -and
            ($full -notmatch '/\.git/') -and
            ($full -notmatch '/build/') -and
            ($full -notmatch '/dist/') -and
            ($_.FullName -ne $ReportPath)
        }

    foreach ($file in $scanFiles) {
        $filePathSlash = Normalize-Slash $file.FullName
        $candidateSlash = Normalize-Slash (Join-Path $Root $CandidateRelativePath)

        # Do not count references inside the candidate itself.
        if ($filePathSlash.StartsWith($candidateSlash)) { continue }

        $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($null -eq $content) { continue }

        foreach ($token in $tokens) {
            if ($content.Contains($token)) {
                return "REFERENCED in $($file.FullName) via token '$token'"
            }
        }
    }

    return $null
}

function Remove-CandidateIfSafe {
    param([string]$CandidateRelativePath)

    $candidateFull = Join-Path $Root $CandidateRelativePath

    if (-not (Test-Path $candidateFull)) {
        Write-ReportLine "MISSING  $CandidateRelativePath"
        return
    }

    $ref = Test-IsReferenced $CandidateRelativePath
    if ($ref) {
        Write-ReportLine "SKIPPED  $CandidateRelativePath  -> $ref"
        return
    }

    $item = Get-Item $candidateFull -Force
    if ($item.PSIsContainer) {
        Remove-Item -Path $candidateFull -Recurse -Force
        Write-ReportLine "REMOVED  folder  $CandidateRelativePath"
    } else {
        Remove-Item -Path $candidateFull -Force
        Write-ReportLine "REMOVED  file    $CandidateRelativePath"
    }
}

Set-Content -Path $ReportPath -Value "Confession Wall cleanup pass 3 report`nStarted: $(Get-Date)`nProject root: $Root`n" -Encoding UTF8

Write-Host "Running guarded cleanup pass 3..."
Write-Host "Report will be saved to: $ReportPath"

$candidates = @(
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

foreach ($candidate in $candidates) {
    Remove-CandidateIfSafe $candidate
}

Write-ReportLine "`nFinished: $(Get-Date)"
Write-Host "Cleanup pass 3 finished. Open cleanup-pass3-report.txt to review details."
