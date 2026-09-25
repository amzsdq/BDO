import fs from 'node:fs'

function assert(condition, message) { if (!condition) throw new Error(message) }
const script = fs.readFileSync(new URL('./bootstrap-production-data.ps1', import.meta.url), 'utf8')
assert(script.includes('Paz\\pad00000.meta'), 'bootstrap must fingerprint extractor archive index')
assert(script.includes('ads_version'), 'bootstrap must include ads_version when present')
assert(script.includes('extractorGameFingerprint'), 'bootstrap must record extractor-compatible short fingerprint')
assert(script.includes('Go 1.26+ is required'), 'bootstrap must enforce reviewed extractor Go floor')
assert(!script.includes('Get-ChildItem -Path $ResolvedGameDir -Filter "BlackDesert*.exe"'), 'bootstrap must not fingerprint an arbitrary executable')
assert(!script.includes('Get-ChildItem -Path $ResolvedGameDir -Filter "*.PAZ"'), 'bootstrap must not fingerprint an arbitrary PAZ archive')
assert(script.includes('import-bdo-extractor.mjs'), 'bootstrap must create the broad client graph before evidence binding')
assert(script.includes('client-broad.json'), 'bootstrap must name the pre-evidence graph client-broad.json')
assert(!script.includes('import-scoped-bdo-extractor.mjs'), 'bootstrap must not prune planner scope before Codex evidence normalization')
console.log('bootstrap production data regression passed')
