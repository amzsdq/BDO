import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import crypto from 'node:crypto'

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')

describe('exact production web evidence byte bindings', () => {
  it('records the exact Korean item-name evidence bytes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bdo-name-hash-'))
    const datasetPath = join(dir, 'dataset.json'), evidencePath = join(dir, 'evidence.json'), outPath = join(dir, 'out.json')
    const dataset = { metadata: {}, items: { '1': { id: 1, nameKo: '아이템 #1' } } }
    const evidenceText = JSON.stringify({ source: 'BDO Codex KR', collectedAt: '2026-09-26T00:00:00Z', items: [{ itemId: 1, nameKo: '검증 재료', sourceUrl: 'https://bdocodex.com/kr/item/1/' }] }, null, 2) + '\n'
    writeFileSync(datasetPath, JSON.stringify(dataset))
    writeFileSync(evidencePath, evidenceText)
    const result = spawnSync(process.execPath, ['scripts/apply-korean-name-evidence.mjs', datasetPath, evidencePath, outPath], { cwd: process.cwd(), encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(JSON.parse(readFileSync(outPath, 'utf8')).metadata.koreanNameEvidence.sha256).toBe(sha256(Buffer.from(evidenceText)))
  })

  it('records the exact substitution evidence bytes during scope finalization', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bdo-sub-hash-'))
    const datasetPath = join(dir, 'dataset.json'), evidencePath = join(dir, 'evidence.json'), outPath = join(dir, 'out.json')
    const dataset = { metadata: {}, items: { '1': { id: 1 }, '2': { id: 2 }, '3': { id: 3 } }, recipes: { r: { id: 'r', skill: 'cooking', outputItemId: 3, variants: [{ id: 'v', inputs: [{ itemId: 1, count: 1 }] }] } }, recipesByOutput: { '3': ['r'] }, byproducts: {} }
    const evidenceText = JSON.stringify({ source: 'BDO Codex KR', collectedAt: '2026-09-26T00:00:00Z', groups: [{ id: 'codex:1', sourceId: '1', sourceUrl: 'https://bdocodex.com/kr/materialgroup/1/', members: [{ itemId: 1, value: 1 }, { itemId: 2, value: 1 }] }] }) + '\n'
    writeFileSync(datasetPath, JSON.stringify(dataset))
    writeFileSync(evidencePath, evidenceText)
    const result = spawnSync(process.execPath, ['scripts/finalize-planner-scope.mjs', datasetPath, outPath, evidencePath], { cwd: process.cwd(), encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(JSON.parse(readFileSync(outPath, 'utf8')).metadata.substitutionEvidenceSha256).toBe(sha256(Buffer.from(evidenceText)))
  })
})
