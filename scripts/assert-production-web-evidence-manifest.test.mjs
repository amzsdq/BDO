import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import crypto from 'node:crypto'
import { assertProductionWebEvidenceManifest, REQUIRED_PRODUCTION_WEB_EVIDENCE_FILES } from './assert-production-web-evidence-manifest.mjs'

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-web-manifest-'))
  const files = REQUIRED_PRODUCTION_WEB_EVIDENCE_FILES.map((file, index) => {
    const bytes = Buffer.from(JSON.stringify({ file, index }) + '\n')
    writeFileSync(join(dir, file), bytes)
    return { file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }
  })
  return { dir, manifest: { schemaVersion: 1, source: 'BDO Codex KR', files } }
}

describe('production web evidence manifest', () => {
  it('accepts an exact complete four-file byte binding', () => {
    const { dir, manifest } = fixture()
    expect(assertProductionWebEvidenceManifest(manifest, dir)).toBe(true)
  })

  it('fails closed when an evidence file changes after the manifest was written', () => {
    const { dir, manifest } = fixture()
    writeFileSync(join(dir, 'codex-items.json'), '{}\n')
    expect(() => assertProductionWebEvidenceManifest(manifest, dir)).toThrow(/hash mismatch/)
  })

  it('fails closed when a required artifact is omitted', () => {
    const { dir, manifest } = fixture()
    manifest.files = manifest.files.slice(1)
    expect(() => assertProductionWebEvidenceManifest(manifest, dir)).toThrow(/missing codex-catalog/)
  })
})
