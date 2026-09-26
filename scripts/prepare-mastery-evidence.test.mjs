import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadRuntimeMasteryRows } from './load-runtime-mastery.mjs'

function curve(columns) {
  return Array.from({ length: 61 }, (_, index) => ({ mastery: index * 50, rates: Array.from({ length: columns }, (__, rate) => (index + rate) / 1000) }))
}
function run(payload) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdo-mastery-'))
  const mastery = path.join(dir, 'mastery.json')
  const out = path.join(dir, 'evidence.json')
  fs.writeFileSync(mastery, JSON.stringify(payload))
  execFileSync(process.execPath, ['scripts/prepare-mastery-evidence.mjs', '--mastery', mastery, '--out', out, '--source-revision', 'iDevelopThings/bdo-data-extractor@5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2', '--client-fingerprint', 'sha256:' + 'a'.repeat(64), '--extracted-at', '2026-09-23T00:00:00Z'])
  return JSON.parse(fs.readFileSync(out, 'utf8'))
}
function runArgs(args) {
  return spawnSync(process.execPath, ['scripts/prepare-mastery-evidence.mjs', ...args], { cwd: process.cwd(), encoding: 'utf8' })
}

async function matchingClientFixture() {
  const runtime = await loadRuntimeMasteryRows()
  const cooking = runtime.cookingRuntimeRows.map((row) => ({ mastery: row.mastery, rates: [0, 0, 0, row.massCookingProbability, 0] }))
  const alchemy = runtime.alchemyRuntimeRows.map((row) => {
    const eventRate = row.normalExtraProbability + row.specialExtraProbability + row.rareExtraProbability
    const rareConditional = eventRate === 0 ? 0 : row.rareExtraProbability / eventRate
    const nonRare = eventRate - row.rareExtraProbability
    const specialConditional = nonRare === 0 ? 0 : row.specialExtraProbability / nonRare
    return { mastery: row.mastery, rates: [row.maxOutputProbability, 0, 0.01569, 1, 0.015691, specialConditional, 0.015692, rareConditional, eventRate] }
  })
  return { cooking, alchemy, processing: [] }
}

describe('production mastery evidence envelope', () => {
  it('emits release-ready evidence only when both derived client curves match the checked-in runtime semantics', async () => {
    const evidence = run(await matchingClientFixture())
    expect(evidence.releaseReady).toBe(true)
    expect(evidence.semanticRateMapping).toBe('VERIFIED')
    expect(evidence.crossCheck.pass).toBe(true)
    expect(evidence.crossCheck.cooking.pass).toBe(true)
    expect(evidence.crossCheck.alchemy.pass).toBe(true)
    expect(evidence.masterySha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects structurally valid but semantically mismatched client curves instead of emitting release-ready evidence', () => {
    expect(() => run({ cooking: curve(5), alchemy: curve(9), processing: [] })).toThrow(/cross-check failed|channel/)
  })

  it('rejects malformed breakpoint/rate structure before semantic promotion', () => {
    expect(() => run({ cooking: curve(4), alchemy: curve(9) })).toThrow()
    expect(() => run({ cooking: curve(5).slice(1), alchemy: curve(9) })).toThrow()
  })

  it.each([
    [['--bogus', 'value'], 'unknown argument: --bogus'],
    [['--mastery', 'a', '--mastery', 'b'], 'duplicate argument: --mastery'],
    [['--mastery', '--out', 'evidence.json'], 'missing value for --mastery'],
  ])('fails closed on malformed CLI arguments %#', (args, message) => {
    const result = runArgs(args)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(message)
  })
})
