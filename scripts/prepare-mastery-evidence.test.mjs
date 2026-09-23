import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function curve(columns) {
  return Array.from({ length: 61 }, (_, index) => ({ mastery: index * 50, rates: Array.from({ length: columns }, (__, rate) => (index + rate) / 1000) }))
}
function run(payload) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdo-mastery-'))
  const mastery = path.join(dir, 'mastery.json')
  const out = path.join(dir, 'evidence.json')
  fs.writeFileSync(mastery, JSON.stringify(payload))
  execFileSync(process.execPath, ['scripts/prepare-mastery-evidence.mjs', '--mastery', mastery, '--out', out, '--source-revision', 'v0.1.9@5bf11bd', '--client-fingerprint', 'client-abc', '--extracted-at', '2026-09-23T00:00:00Z'])
  return JSON.parse(fs.readFileSync(out, 'utf8'))
}

describe('production mastery evidence envelope', () => {
  it('rejects structurally valid but semantically mismatched client curves instead of emitting release-ready evidence', () => {
    expect(() => run({ cooking: curve(5), alchemy: curve(9), processing: [] })).toThrow(/cross-check failed|channel/)
  })

  it('rejects malformed breakpoint/rate structure before semantic promotion', () => {
    expect(() => run({ cooking: curve(4), alchemy: curve(9) })).toThrow()
    expect(() => run({ cooking: curve(5).slice(1), alchemy: curve(9) })).toThrow()
  })
})
