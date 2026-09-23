import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('scoped canonical extractor import', () => {
  it('drops unrelated and ghost extractor items while retaining the complete recipe graph', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bdo-scoped-import-'))
    const itemsPath = join(dir, 'items.json'), recipesPath = join(dir, 'recipes.json'), outPath = join(dir, 'dataset.json')
    writeFileSync(itemsPath, JSON.stringify([
      { id: 100, name: 'Cook', icon: 'a.dds' }, { id: 101, name: 'Alchemy', icon: 'b.dds' },
      { id: 200, name: 'Shared ingredient', icon: 'c.dds' },
      { id: 999999, name: 'Unrelated ghost' },
    ]))
    writeFileSync(recipesPath, JSON.stringify([
      { output: 100, type: 'COOK', inputs: [{ item: 200, count: 1 }] },
      { output: 101, type: 'ALCHEMY', inputs: [{ item: 200, count: 2 }] },
    ]))
    execFileSync(process.execPath, [resolve('scripts/import-scoped-bdo-extractor.mjs'), '--items', itemsPath, '--recipes', recipesPath, '--out', outPath, '--source-revision', 'test'])
    const dataset = JSON.parse(readFileSync(outPath, 'utf8'))
    expect(Object.keys(dataset.items)).toEqual(['100', '101', '200'])
    expect(dataset.metadata.itemScope).toBe('planner-referenced-cooking-alchemy-v2')
    expect(dataset.metadata.importedItemCount).toBe(4)
    expect(dataset.metadata.scopedItemCount).toBe(3)
    expect(dataset.metadata.fingerprint).toBeUndefined()
  })
})
