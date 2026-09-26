import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const script = path.resolve('scripts/seal-snapshot-icon-provenance.mjs')
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bdo-icon-seal-'))
  fs.mkdirSync(path.join(root, 'icons', 'nested'), { recursive: true })
  fs.writeFileSync(path.join(root, 'icons', '1.webp'), 'one')
  fs.writeFileSync(path.join(root, 'icons', 'nested', '2.webp'), 'two')
  const redirects = Buffer.from('{"urn::item:1":"icons/1.webp"}\n')
  fs.writeFileSync(path.join(root, 'asset_redirects.json'), redirects)
  fs.writeFileSync(path.join(root, 'provenance.json'), JSON.stringify({ schemaVersion: 1, supportedRegion: 'KR', clientFingerprint: 'sha256:' + '1'.repeat(64), artifactSha256: { 'asset_redirects.json': sha(redirects) } }))
  return root
}
describe('snapshot icon provenance seal', () => {
  test('is deterministic and refuses to bless post-seal icon drift', () => {
    const root = fixture()
    execFileSync(process.execPath, [script, root])
    const first = JSON.parse(fs.readFileSync(path.join(root, 'provenance.json'), 'utf8')).iconsSnapshotSha256
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    execFileSync(process.execPath, [script, root])
    expect(JSON.parse(fs.readFileSync(path.join(root, 'provenance.json'), 'utf8')).iconsSnapshotSha256).toBe(first)
    fs.writeFileSync(path.join(root, 'icons', '1.webp'), 'changed')
    expect(() => execFileSync(process.execPath, [script, root], { stdio: 'pipe' })).toThrow()
    expect(JSON.parse(fs.readFileSync(path.join(root, 'provenance.json'), 'utf8')).iconsSnapshotSha256).toBe(first)
  })
  test('rejects redirect provenance drift', () => {
    const root = fixture()
    fs.appendFileSync(path.join(root, 'asset_redirects.json'), 'tamper')
    expect(() => execFileSync(process.execPath, [script, root], { stdio: 'pipe' })).toThrow()
  })
})
