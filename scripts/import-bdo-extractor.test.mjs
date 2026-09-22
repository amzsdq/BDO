import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('bdo extractor importer icon contract', () => {
  it('maps extractor DDS source paths to decoded item-id WebP assets', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bdo-import-'))
    const itemsPath = join(dir, 'items.json')
    const recipesPath = join(dir, 'recipes.json')
    const outPath = join(dir, 'dataset.json')
    writeFileSync(itemsPath, JSON.stringify([
      { id: 100, name: 'Cooking Output', icon: 'New_Icon/source/00000100.dds', weight: 0.1 },
      { id: 101, name: 'Alchemy Output', icon: 'New_Icon/source/00000101.dds', weight: 0.1 },
      { id: 200, name: 'Ingredient', icon: 'New_Icon/source/00000200.dds', weight: 0.2 },
    ]))
    writeFileSync(recipesPath, JSON.stringify([
      { output: 100, type: 'COOK', inputs: [{ item: 200, count: 1 }] },
      { output: 101, type: 'ALCHEMY', inputs: [{ item: 200, count: 2 }] },
    ]))
    execFileSync(process.execPath, [resolve('scripts/import-bdo-extractor.mjs'), '--items', itemsPath, '--recipes', recipesPath, '--out', outPath, '--source-revision', 'test'])
    const dataset = JSON.parse(readFileSync(outPath, 'utf8'))
    expect(dataset.items['100'].iconPath).toBe('icons/100.webp')
    expect(dataset.items['101'].iconPath).toBe('icons/101.webp')
    expect(dataset.items['200'].iconPath).toBe('icons/200.webp')
    expect(dataset.metadata.extractorContract).toContain('icons/<itemId>.webp')
  })
})
