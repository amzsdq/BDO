import { execFileSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const TEST_EXTRACTOR_SHA = '5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2'

function importDataset(items, recipes) {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-import-'))
  const itemsPath = join(dir, 'items.json')
  const recipesPath = join(dir, 'recipes.json')
  const outPath = join(dir, 'dataset.json')
  writeFileSync(itemsPath, JSON.stringify(items))
  writeFileSync(recipesPath, JSON.stringify(recipes))
  execFileSync(process.execPath, [resolve('scripts/import-bdo-extractor.mjs'), '--items', itemsPath, '--recipes', recipesPath, '--out', outPath, '--source-revision', TEST_EXTRACTOR_SHA])
  return { dataset: JSON.parse(readFileSync(outPath, 'utf8')), outPath }
}
function expectedVariantId(identity) {
  return `v-${crypto.createHash('sha256').update(identity).digest('hex').slice(0, 12)}`
}

describe('bdo extractor importer icon contract', () => {
  it('maps extractor DDS source paths to decoded item-id WebP assets', () => {
    const { dataset } = importDataset([
      { id: 100, name: 'Cooking Output', icon: 'New_Icon/source/00000100.dds', weight: 0.1 },
      { id: 101, name: 'Alchemy Output', icon: 'New_Icon/source/00000101.dds', weight: 0.1 },
      { id: 200, name: 'Ingredient', icon: 'New_Icon/source/00000200.dds', weight: 0.2 },
    ], [
      { output: 100, type: 'COOK', inputs: [{ item: 200, count: 1 }] },
      { output: 101, type: 'ALCHEMY', inputs: [{ item: 200, count: 2 }] },
    ])
    expect(dataset.items['100'].iconPath).toBe('icons/100.webp')
    expect(dataset.items['101'].iconPath).toBe('icons/101.webp')
    expect(dataset.items['200'].iconPath).toBe('icons/200.webp')
    expect(dataset.metadata.extractorContract).toContain('icons/<itemId>.webp')
    expect(dataset.metadata.sourceRevision).toBe(`iDevelopThings/bdo-data-extractor@${TEST_EXTRACTOR_SHA}`)
  })

  it('emits a byproduct graph that satisfies the structural validator', () => {
    const { dataset, outPath } = importDataset([
      { id: 100, name: 'Cooking Output', weight: 0.1 },
      { id: 101, name: 'Alchemy Output', weight: 0.1 },
      { id: 102, name: 'Cooking Byproduct', weight: 0.1 },
      { id: 200, name: 'Ingredient', weight: 0.2 },
    ], [
      { output: 100, type: 'COOK', inputs: [{ item: 200, count: 1 }] },
      { output: 101, type: 'ALCHEMY', inputs: [{ item: 200, count: 2 }] },
      { output: 102, type: 'COOK', byproductOf: 100, inputs: [{ item: 200, count: 1 }] },
    ])
    expect(dataset.byproducts['102']).toEqual({ outputItemId: 102, producedWhileCraftingItemIds: [100] })
    execFileSync(process.execPath, [resolve('scripts/validate-dataset.mjs'), outPath])
  })

  it.each([
    ['direct first', false],
    ['byproduct first', true],
  ])('preserves direct and byproduct rows with identical inputs regardless of order: %s', (_label, reverse) => {
    const direct = { output: 102, type: 'COOK', inputs: [{ item: 200, count: 1 }] }
    const byproduct = { output: 102, type: 'COOK', byproductOf: 100, inputs: [{ item: 200, count: 1 }] }
    const collisionRows = reverse ? [byproduct, direct] : [direct, byproduct]
    const { dataset } = importDataset([
      { id: 100, name: 'Parent Cooking Output', weight: 0.1 },
      { id: 101, name: 'Alchemy Output', weight: 0.1 },
      { id: 102, name: 'Direct And Byproduct Output', weight: 0.1 },
      { id: 200, name: 'Ingredient', weight: 0.2 },
    ], [
      { output: 100, type: 'COOK', inputs: [{ item: 200, count: 3 }] },
      { output: 101, type: 'ALCHEMY', inputs: [{ item: 200, count: 2 }] },
      ...collisionRows,
    ])

    expect(dataset.recipes['cooking:102']).toBeDefined()
    expect(dataset.recipes['cooking:102'].variants).toHaveLength(1)
    expect(dataset.recipes['cooking:102'].variants[0].inputs).toEqual([{ itemId: 200, count: 1 }])
    expect(dataset.recipes['cooking:102'].variants[0].id).toBe(expectedVariantId('direct|200:1'))
    expect(dataset.byproducts['102']).toEqual({ outputItemId: 102, producedWhileCraftingItemIds: [100] })
  })

  it('preserves alternative direct recipes with deterministic role-aware identities across source row ordering', () => {
    const items = [
      { id: 100, name: 'Cooking Output', weight: 0.1 },
      { id: 101, name: 'Alchemy Output', weight: 0.1 },
      { id: 200, name: 'Ingredient A', weight: 0.2 },
      { id: 201, name: 'Ingredient B', weight: 0.3 },
    ]
    const cookingA = { output: 100, type: 'COOK', inputs: [{ item: 200, count: 2 }] }
    const cookingB = { output: 100, type: 'COOK', inputs: [{ item: 201, count: 3 }] }
    const alchemy = { output: 101, type: 'ALCHEMY', inputs: [{ item: 200, count: 1 }] }

    const first = importDataset(items, [cookingA, cookingB, alchemy]).dataset.recipes['cooking:100'].variants
    const second = importDataset(items, [cookingB, cookingA, alchemy]).dataset.recipes['cooking:100'].variants

    expect(first).toHaveLength(2)
    expect(second).toEqual(first)
    expect(new Set(first.map((variant) => variant.id)).size).toBe(2)
    expect(first.map((variant) => variant.id).sort()).toEqual([
      expectedVariantId('direct|200:2'),
      expectedVariantId('direct|201:3'),
    ].sort())
    expect(first.every((variant) => /^v-[0-9a-f]{12}$/.test(variant.id))).toBe(true)
  })

  it.each([
    [['--bogus', 'x'], 'unknown argument: --bogus'],
    [['--items', 'a', '--items', 'b'], 'duplicate argument: --items'],
    [['--items', '--recipes'], 'usage:'],
  ])('rejects malformed CLI arguments instead of silently accepting them: %j', (extraArgs, expectedError) => {
    const result = spawnSync(process.execPath, [resolve('scripts/import-bdo-extractor.mjs'), ...extraArgs], { encoding: 'utf8' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(expectedError)
  })

  it('records a supplied client fingerprint in dataset metadata', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bdo-import-fingerprint-'))
    const itemsPath = join(dir, 'items.json')
    const recipesPath = join(dir, 'recipes.json')
    const outPath = join(dir, 'dataset.json')
    writeFileSync(itemsPath, JSON.stringify([
      { id: 100, name: 'Cooking Output', weight: 0.1 },
      { id: 101, name: 'Alchemy Output', weight: 0.1 },
      { id: 200, name: 'Ingredient', weight: 0.2 },
    ]))
    writeFileSync(recipesPath, JSON.stringify([
      { output: 100, type: 'COOK', inputs: [{ item: 200, count: 1 }] },
      { output: 101, type: 'ALCHEMY', inputs: [{ item: 200, count: 2 }] },
    ]))
    const fingerprint = 'sha256:' + 'a'.repeat(64)
    execFileSync(process.execPath, [resolve('scripts/import-bdo-extractor.mjs'), '--items', itemsPath, '--recipes', recipesPath, '--out', outPath, '--source-revision', TEST_EXTRACTOR_SHA, '--client-fingerprint', fingerprint])
    expect(JSON.parse(readFileSync(outPath, 'utf8')).metadata.clientFingerprint).toBe(fingerprint)
  })

  it('rejects floating or missing extractor revisions', () => {
    const base = [resolve('scripts/import-bdo-extractor.mjs'), '--items', 'missing-items.json', '--recipes', 'missing-recipes.json', '--out', 'missing-out.json']
    const missing = spawnSync(process.execPath, base, { encoding: 'utf8' })
    expect(missing.status).not.toBe(0)
    expect(missing.stderr).toContain('required: --items --recipes --out --source-revision')

    const floating = spawnSync(process.execPath, [...base, '--source-revision', 'v0.1.9'], { encoding: 'utf8' })
    expect(floating.status).not.toBe(0)
    expect(floating.stderr).toContain('exact 40-character')
  })
})
