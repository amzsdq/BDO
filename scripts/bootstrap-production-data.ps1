param(
  [string]$GameDir = "",
  [string]$OutDir = ".bdo-production-snapshot",
  [string]$ExtractorRevision = "5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-BdoGameDir {
  param([string]$Explicit)
  if ($Explicit) {
    $resolved = (Resolve-Path $Explicit).Path
    if (-not (Test-Path $resolved -PathType Container)) { throw "GameDir not found: $Explicit" }
    return $resolved
  }

  $candidates = New-Object System.Collections.Generic.List[string]
  foreach ($candidate in @(
    (Join-Path ${env:ProgramFiles(x86)} "Steam\steamapps\common\Black Desert Online"),
    (Join-Path $env:ProgramFiles "Steam\steamapps\common\Black Desert Online"),
    "C:\Pearlabyss\BlackDesert",
    "C:\PearlAbyss\BlackDesert"
  )) {
    if ($candidate) { $candidates.Add($candidate) }
  }

  foreach ($steamRoot in @(
    (Join-Path ${env:ProgramFiles(x86)} "Steam"),
    (Join-Path $env:ProgramFiles "Steam")
  )) {
    $vdf = Join-Path $steamRoot "steamapps\libraryfolders.vdf"
    if (-not (Test-Path $vdf)) { continue }
    $text = Get-Content $vdf -Raw
    foreach ($match in [regex]::Matches($text, '"path"\s+"([^"]+)"')) {
      $library = $match.Groups[1].Value -replace '\\\\','\'
      $candidates.Add((Join-Path $library "steamapps\common\Black Desert Online"))
    }
  }

  foreach ($candidate in $candidates | Select-Object -Unique) {
    if ($candidate -and (Test-Path $candidate -PathType Container)) { return (Resolve-Path $candidate).Path }
  }
  throw "Black Desert install was not found automatically. Re-run with -GameDir '<installed Black Desert directory>'."
}

function Require-Command {
  param([string]$Name)
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) { throw "Required command '$Name' was not found in PATH." }
  return $command.Source
}

if ($ExtractorRevision -notmatch '^[0-9a-f]{40}$') {
  throw "ExtractorRevision must be an exact 40-character git commit SHA, not a floating tag/ref: $ExtractorRevision"
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ResolvedGameDir = Resolve-BdoGameDir $GameDir
$ResolvedOutDir = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $OutDir))
$ServiceIniSource = Join-Path $ResolvedGameDir "service.ini"
if (-not (Test-Path $ServiceIniSource -PathType Leaf)) { throw "KR region evidence missing: $ServiceIniSource" }
$ServiceIniText = Get-Content $ServiceIniSource -Raw
$ServiceTypeMatch = [regex]::Match($ServiceIniText, '(?im)^\s*TYPE\s*=\s*([^\r\n;#]+)')
if (-not $ServiceTypeMatch.Success -or $ServiceTypeMatch.Groups[1].Value.Trim().ToUpperInvariant() -ne "KR") {
  throw "Selected Black Desert install is not verified as KR by service.ini TYPE=KR"
}
New-Item -ItemType Directory -Force -Path $ResolvedOutDir | Out-Null

Require-Command "go" | Out-Null
Require-Command "node" | Out-Null
Require-Command "npm" | Out-Null

$GoVersionText = (& go version).Trim()
$GoVersionMatch = [regex]::Match($GoVersionText, 'go(\d+)\.(\d+)(?:\.(\d+))?')
if (-not $GoVersionMatch.Success) { throw "Could not parse Go version: $GoVersionText" }
$GoMajor = [int]$GoVersionMatch.Groups[1].Value
$GoMinor = [int]$GoVersionMatch.Groups[2].Value
if ($GoMajor -lt 1 -or ($GoMajor -eq 1 -and $GoMinor -lt 26)) {
  throw "Go 1.26+ is required by the reviewed extractor revision; found $GoVersionText"
}

Write-Host "[1/6] Installing reviewed extractor commit $ExtractorRevision"
& go install "github.com/iDevelopThings/bdo-data-extractor@$ExtractorRevision"
if ($LASTEXITCODE -ne 0) { throw "go install failed" }

$GoPath = (& go env GOPATH).Trim()
$Extractor = Join-Path $GoPath "bin\bdo-data-extractor.exe"
if (-not (Test-Path $Extractor)) { throw "Extractor binary not found after go install: $Extractor" }

Write-Host "[2/6] Extracting canonical client data"
& $Extractor build --game $ResolvedGameDir --out $ResolvedOutDir
if ($LASTEXITCODE -ne 0) { throw "bdo-data-extractor build failed" }

Write-Host "[3/6] Extracting canonical item icons"
& $Extractor icons --game $ResolvedGameDir --out $ResolvedOutDir
if ($LASTEXITCODE -ne 0) { throw "bdo-data-extractor icons failed" }

$Items = Join-Path $ResolvedOutDir "items.json"
$Recipes = Join-Path $ResolvedOutDir "recipes.json"
$Mastery = Join-Path $ResolvedOutDir "mastery.json"
foreach ($required in @($Items, $Recipes, $Mastery)) {
  if (-not (Test-Path $required)) { throw "Expected extractor output missing: $required" }
}

$ExtractedAt = [DateTime]::UtcNow.ToString("o")
$MetaPath = Join-Path $ResolvedGameDir "Paz\pad00000.meta"
if (-not (Test-Path $MetaPath -PathType Leaf)) { throw "Extractor fingerprint source missing: $MetaPath" }
$AdsVersionPath = Join-Path $ResolvedGameDir "ads_version"
$Sha = [System.Security.Cryptography.SHA256]::Create()
try {
  foreach ($FingerprintPath in @($MetaPath, $AdsVersionPath)) {
    if (-not (Test-Path $FingerprintPath -PathType Leaf)) { continue }
    $Stream = [System.IO.File]::OpenRead($FingerprintPath)
    try {
      $Buffer = New-Object byte[] 1048576
      while (($Read = $Stream.Read($Buffer, 0, $Buffer.Length)) -gt 0) {
        [void]$Sha.TransformBlock($Buffer, 0, $Read, $Buffer, 0)
      }
    } finally {
      $Stream.Dispose()
    }
  }
  [void]$Sha.TransformFinalBlock((New-Object byte[] 0), 0, 0)
  $ClientHash = ([System.BitConverter]::ToString($Sha.Hash) -replace '-', '').ToLowerInvariant()
} finally {
  $Sha.Dispose()
}
$ClientFingerprint = "sha256:$ClientHash"
$ExtractorGameFingerprint = $ClientHash.Substring(0, 16)
$SourceRevision = "iDevelopThings/bdo-data-extractor@$ExtractorRevision"
$ServiceIniSnapshot = Join-Path $ResolvedOutDir "service.ini"
Copy-Item -LiteralPath $ServiceIniSource -Destination $ServiceIniSnapshot -Force

Write-Host "[4/6] Recording same-snapshot provenance"
$Hashes = @{}
foreach ($path in @($Items, $Recipes, $Mastery, $ServiceIniSnapshot)) {
  $Hashes[[System.IO.Path]::GetFileName($path)] = (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant()
}
$Provenance = [ordered]@{
  schemaVersion = 1
  source = "installed Black Desert client"
  supportedRegion = "KR"
  extractor = "iDevelopThings/bdo-data-extractor"
  extractorRevision = $ExtractorRevision
  extractedAt = $ExtractedAt
  clientFingerprint = $ClientFingerprint
  extractorGameFingerprint = $ExtractorGameFingerprint
  fingerprintInputs = @("Paz/pad00000.meta", "ads_version-if-present")
  gameDirectoryRecorded = $false
  regionEvidence = [ordered]@{
    file = "service.ini"
    type = "KR"
    sha256 = $Hashes["service.ini"]
  }
  artifactSha256 = $Hashes
}
$ProvenancePath = Join-Path $ResolvedOutDir "provenance.json"
$Provenance | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $ProvenancePath

Write-Host "[5/6] Importing Cooking/Alchemy graph into planner schema"
$Dataset = Join-Path $ResolvedOutDir "client-dataset.json"
Push-Location $RepoRoot
try {
  & node scripts/import-scoped-bdo-extractor.mjs --items $Items --recipes $Recipes --out $Dataset --source-revision $SourceRevision --client-fingerprint $ClientFingerprint
  if ($LASTEXITCODE -ne 0) { throw "planner structural import failed" }

  Write-Host "[6/6] Building mastery cross-check evidence"
  $MasteryEvidence = Join-Path $ResolvedOutDir "mastery-evidence.json"
  & node scripts/prepare-mastery-evidence.mjs --mastery $Mastery --out $MasteryEvidence --source-revision $SourceRevision --client-fingerprint $ClientFingerprint --extracted-at $ExtractedAt
  if ($LASTEXITCODE -ne 0) { throw "mastery evidence generation failed" }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Production client snapshot acquired successfully."
Write-Host "snapshot=$ResolvedOutDir"
Write-Host "dataset=$Dataset"
Write-Host "provenance=$ProvenancePath"
Write-Host "extractorRevision=$ExtractorRevision"
Write-Host "clientFingerprint=$ClientFingerprint"
Write-Host "extractorGameFingerprint=$ExtractorGameFingerprint"
Write-Host "Next: collect Codex KR catalog evidence, enrich Korean names/icons, reconcile, then run release gate."
