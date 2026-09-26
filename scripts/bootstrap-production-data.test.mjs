import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const script = readFileSync('scripts/bootstrap-production-data.ps1', 'utf8')

describe('production bootstrap extractor contract', () => {
  it('reads build artifacts directly from the extractor output root', () => {
    expect(script).toContain('$Items = Join-Path $ResolvedOutDir "items.json"')
    expect(script).toContain('$Recipes = Join-Path $ResolvedOutDir "recipes.json"')
    expect(script).toContain('$Mastery = Join-Path $ResolvedOutDir "mastery.json"')
    expect(script).not.toMatch(/Join-Path \$ResolvedOutDir "data\\(?:items|recipes|mastery)\.json"/)
  })

  it('passes the installed-client fingerprint into the scoped importer and mastery evidence', () => {
    expect(script).toMatch(/import-scoped-bdo-extractor\.mjs[^\r\n]*--client-fingerprint \$ClientFingerprint/)
    expect(script).toMatch(/prepare-mastery-evidence\.mjs[^\r\n]*--client-fingerprint \$ClientFingerprint/)
  })

  it('fails closed unless the selected installed client declares the KR service region', () => {
    expect(script).toContain('$ServiceIni = Join-Path $ResolvedGameDir "service.ini"')
    expect(script).toContain('service.ini is missing')
    expect(script).toContain("$ServiceIniText -notmatch '(?im)^\\s*TYPE\\s*=\\s*KR\\s* to an exact commit by default and rejects floating revisions', () => {
    expect(script).toContain('[string]$ExtractorRevision = "5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2"')
    expect(script).toContain("ExtractorRevision must be an exact 40-character git commit SHA")
  })
})
")
    expect(script).toContain('service.ini must declare TYPE=KR')
  })

  it('pins the reviewed extractor to an exact commit by default and rejects floating revisions', () => {
    expect(script).toContain('[string]$ExtractorRevision = "5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2"')
    expect(script).toContain("ExtractorRevision must be an exact 40-character git commit SHA")
  })
})
