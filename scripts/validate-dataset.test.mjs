import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function validDataset() {
  return {
    metadata: { generatedAt: '2026-09-23T00:00:00Z', supportedRegion: 'KR', sources: ['client'], counts: { cooking: 1, alchemy: 1 } },
    items: {
      '10': { id: 10, nameKo: '요리 결과', weightLT: 0.1 }, '11': { id: 11, nameKo: '연금 결과', weightLT: 0.1 },
      '20': { id: 20, nameKo: '재료', weightLT: 0.2 }, '21': { id: 21, nameKo: '대체 재료', weightLT: 0.2 }, '30': { id: 30, nameKo: '부산물', weightLT: 0.1 },
    },
    recipes: {
      cook: { id: 'cook', skill: 'cooking', outputItemId: 10, yield: { min: 1, max: 2, expected: 1.5 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 2 }] }] },
      alch: { id: 'alch', skill: 'alchemy', outputItemId: 11, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 20, count: 3 }] }] },
    },
    recipesByOutput: { '10': ['cook'], '11': ['alch'] },
  }
}
function run(dataset) { const dir = mkdtempSync(join(tmpdir(), 'bdo-validate-')); const file = join(dir, 'dataset.json'); writeFileSync(file, JSON.stringify(dataset)); return spawnSync(process.execPath, ['scripts/validate-dataset.mjs', file], { cwd: process.cwd(), encoding: 'utf8' }) }

describe('canonical dataset validator', () => {
  it('accepts a structurally consistent Cooking + Alchemy dataset', () => { const result = run(validDataset()); expect(result.status).toBe(0); expect(JSON.parse(result.stdout).ok).toBe(true) })
  it('accepts source-backed substitution membership', () => { const dataset = validDataset(); dataset.substitutionGroups = { 'codex:6502': { id: 'codex:6502', memberItemIds: [20, 21], source: { provider: 'BDO Codex KR', sourceId: '6502', verifiedAt: '2026-09-23' } } }; dataset.recipes.cook.variants[0].inputs[0].substitutionGroupId = 'codex:6502'; const result = run(dataset); expect(result.status).toBe(0); expect(JSON.parse(result.stdout).substitutionGroups).toBe(1) })
  it('rejects unknown or inconsistent substitution evidence', () => { const dataset = validDataset(); dataset.substitutionGroups = { 'codex:6502': { id: 'codex:6502', memberItemIds: [21, 999], source: { provider: 'BDO Codex KR', sourceId: '6502', verifiedAt: 'bad-date' } } }; dataset.recipes.cook.variants[0].inputs[0].substitutionGroupId = 'codex:6502'; const result = run(dataset); expect(result.status).toBe(1); expect(result.stderr).toContain('unknown member item 999'); expect(result.stderr).toContain('verifiedAt invalid'); expect(result.stderr).toContain('canonical input 20 is not in substitution group codex:6502') })
  it('rejects a broken recipesByOutput reverse index', () => { const dataset = validDataset(); dataset.recipesByOutput['10'] = ['alch']; const result = run(dataset); expect(result.status).toBe(1); expect(result.stderr).toContain('outputs 11'); expect(result.stderr).toContain('cook: missing from recipesByOutput 10') })
  it('rejects duplicate ingredient rows inside a canonical variant', () => { const dataset = validDataset(); dataset.recipes.cook.variants[0].inputs.push({ itemId: 20, count: 1 }); const result = run(dataset); expect(result.status).toBe(1); expect(result.stderr).toContain('duplicate input item 20') })
  it('rejects invalid yield and item identity metadata', () => { const dataset = validDataset(); dataset.items['20'].id = 22; dataset.recipes.cook.yield.expected = 3; const result = run(dataset); expect(result.status).toBe(1); expect(result.stderr).toContain('item key/id mismatch'); expect(result.stderr).toContain('expected yield outside min/max') })

  it('accepts a byproduct whose output and craftable parent items are known', () => {
    const dataset = validDataset(); dataset.byproducts = { '30': { outputItemId: 30, producedWhileCraftingItemIds: [10] } }
    const result = run(dataset); expect(result.status).toBe(0); expect(JSON.parse(result.stdout).byproducts).toBe(1)
  })
  it('rejects malformed, unknown, duplicate, or non-craftable byproduct references', () => {
    const dataset = validDataset(); dataset.byproducts = {
      '30': { outputItemId: 31, producedWhileCraftingItemIds: [10, 10, 21, 999] },
      '999': { outputItemId: 999, producedWhileCraftingItemIds: [] },
    }
    const result = run(dataset); expect(result.status).toBe(1); expect(result.stderr).toContain('key/outputItemId mismatch'); expect(result.stderr).toContain('duplicate parent item 10'); expect(result.stderr).toContain('parent item 21 has no craftable recipe'); expect(result.stderr).toContain('unknown parent item 999'); expect(result.stderr).toContain('unknown output item'); expect(result.stderr).toContain('parent item list must be non-empty')
  })
  it('includes byproducts in the structural hash', () => {
    const base = validDataset(); const without = run(base); const withByproduct = validDataset(); withByproduct.byproducts = { '30': { outputItemId: 30, producedWhileCraftingItemIds: [10] } }; const withResult = run(withByproduct)
    expect(without.status).toBe(0); expect(withResult.status).toBe(0); expect(JSON.parse(without.stdout).structuralHash).not.toBe(JSON.parse(withResult.stdout).structuralHash)
  })
})
