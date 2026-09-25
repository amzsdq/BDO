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
New-Item -ItemType Directory -Force -Path $ResolvedOutDir | Out-Null

Require-Command "go" | Out-Null
Require-Command "node" | Out-Null
Require-Command "npm" | Out-Null

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

$Items = Join-Path $ResolvedOutDir "data\items.json"
$Recipes = Join-Path $ResolvedOutDir "data\recipes.json"
$Mastery = Join-Path $ResolvedOutDir "data\mastery.json"
foreach ($required in @($Items, $Recipes, $Mastery)) {
  if (-not (Test-Path $required)) { throw "Expected extractor output missing: $required" }
}

$ExtractedAt = [DateTime]::UtcNow.ToString("o")
$ClientExe = Get-ChildItem -Path $ResolvedGameDir -Filter "BlackDesert*.exe" -Recurse -File -ErrorAction SilentlyContinue |
  Sort-Object FullName |
  Select-Object -First 1
if ($ClientExe) {
  $ClientHash = (Get-FileHash $ClientExe.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $ClientVersion = $ClientExe.VersionInfo.FileVersion
} else {
  $Paz = Get-ChildItem -Path $ResolvedGameDir -Filter "*.PAZ" -Recurse -File -ErrorAction SilentlyContinue |
    Sort-Object FullName |
    Select-Object -First 1
  if (-not $Paz) { throw "Could not find a Black Desert executable or PAZ file for client fingerprinting." }
  $ClientHash = (Get-FileHash $Paz.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $ClientVersion = $null
}
$ClientFingerprint = "sha256:$ClientHash"
$SourceRevision = "iDevelopThings/bdo-data-extractor@$ExtractorRevision"

Write-Host "[4/6] Recording same-snapshot provenance"
$Hashes = @{}
foreach ($path in @($Items, $Recipes, $Mastery)) {
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
  clientFileVersion = $ClientVersion
  gameDirectoryRecorded = $false
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
Write-Host "Next: collect Codex KR catalog evidence, enrich Korean names/icons, reconcile, then run release gate."
