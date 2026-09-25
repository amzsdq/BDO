import fs from 'node:fs'

function assert(condition, message) { if (!condition) throw new Error(message) }
const script = fs.readFileSync(new URL('./bootstrap-production-data.ps1', import.meta.url), 'utf8')
assert(script.includes('Paz\\pad00000.meta'), 'bootstrap must fingerprint extractor archive index')
assert(script.includes('ads_version'), 'bootstrap must include ads_version when present')
assert(script.includes('extractorGameFingerprint'), 'bootstrap must record extractor-compatible short fingerprint')
assert(script.includes('Go 1.26+ is required'), 'bootstrap must enforce reviewed extractor Go floor')
assert(!script.includes('Get-ChildItem -Path $ResolvedGameDir -Filter "BlackDesert*.exe"'), 'bootstrap must not fingerprint an arbitrary executable')
assert(!script.includes('Get-ChildItem -Path $ResolvedGameDir -Filter "*.PAZ"'), 'bootstrap must not fingerprint an arbitrary PAZ archive')
console.log('bootstrap production data regression passed')
