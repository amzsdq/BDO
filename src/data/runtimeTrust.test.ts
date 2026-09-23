import { describe, expect, it } from 'vitest'
import type { RecipeDataset } from '../domain/types'
import { hasRuntimeVerifiedEvidence } from './runtimeTrust'

function fixture(): RecipeDataset {
  return {
    metadata: {
      generatedAt: '2026-09-23T00:00:00Z', supportedRegion: 'KR',
      sources: ['client', 'codex'], sourceRevision: 'client-sha-abc123', status: 'COMPLETE_VERIFIED', reconciliationStatus: 'ZERO_UNEXPLAINED_DIFF',
      verifiedAt: '2026-09-23T00:01:00Z', counts: { cooking: 1, alchemy: 1 },
    } as RecipeDataset['metadata'],
    items: {
      '1': { id: 1, nameKo: '요리', iconPath: 'icons/1.webp' },
      '2': { id: 2, nameKo: '연금', iconPath: 'icons/2.webp' },
      '3': { id: 3, nameKo: '재료', iconPath: 'icons/3.webp' },
    },
    recipes: {
      cook: { id: 'cook', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 3, count: 1 }] }] },
      alch: { id: 'alch', skill: 'alchemy', outputItemId: 2, yield: { min: 1, max: 1 }, variants: [{ id: 'v1', inputs: [{ itemId: 3, count: 1 }] }] },
    },
    recipesByOutput: { '1': ['cook'], '2': ['alch'] },
  }
}

async function withFingerprint(dataset: RecipeDataset): Promise<RecipeDataset> {
  const bytes = new TextEncoder().encode(JSON.stringify(dataset))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  ;(dataset.metadata as any).fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return dataset
}
async function promoteFixture(): Promise<RecipeDataset> { return withFingerprint(fixture()) }

describe('hasRuntimeVerifiedEvidence', () => {
  it('accepts a structurally consistent promoted artifact with a matching payload fingerprint', async () => { expect(await hasRuntimeVerifiedEvidence(await promoteFixture())).toBe(true) })
  it('rejects status-only claims', async () => { const dataset = await promoteFixture(); delete (dataset.metadata as any).reconciliationStatus; expect(await hasRuntimeVerifiedEvidence(dataset)).toBe(false) })
  it('rejects missing or unrecorded canonical client revision even when the artifact fingerprint matches', async () => {
    for (const sourceRevision of [undefined, '', 'unrecorded', 'UNRECORDED']) { const dataset = fixture(); (dataset.metadata as any).sourceRevision = sourceRevision; expect(await hasRuntimeVerifiedEvidence(await withFingerprint(dataset))).toBe(false) }
  })
  it('rejects non-canonical local icon paths even when the artifact fingerprint matches', async () => { const dataset = fixture(); dataset.items['3'].iconPath = '../../package.json'; expect(await hasRuntimeVerifiedEvidence(await withFingerprint(dataset))).toBe(false) })
  it('rejects stale recipe counts', async () => { const dataset = await promoteFixture(); (dataset.metadata as any).counts.cooking = 2; expect(await hasRuntimeVerifiedEvidence(dataset)).toBe(false) })
  it('rejects unresolved names and icons', async () => {
    const unresolvedName = await promoteFixture(); unresolvedName.items['3'].nameKo = '아이템 #3'; expect(await hasRuntimeVerifiedEvidence(unresolvedName)).toBe(false)
    const missingIcon = await promoteFixture(); delete missingIcon.items['3'].iconPath; expect(await hasRuntimeVerifiedEvidence(missingIcon)).toBe(false)
  })
  it('rejects recipes with missing output/input items or empty variants', async () => {
    const missingOutput = fixture(); missingOutput.recipes.cook.outputItemId = 999; expect(await hasRuntimeVerifiedEvidence(await withFingerprint(missingOutput))).toBe(false)
    const missingInput = fixture(); missingInput.recipes.cook.variants[0].inputs[0].itemId = 999; expect(await hasRuntimeVerifiedEvidence(await withFingerprint(missingInput))).toBe(false)
    const emptyVariant = fixture(); emptyVariant.recipes.cook.variants[0].inputs = []; expect(await hasRuntimeVerifiedEvidence(await withFingerprint(emptyVariant))).toBe(false)
  })
  it('rejects count-preserving recipe tampering after promotion', async () => { const dataset = await promoteFixture(); dataset.recipes.cook.variants[0].inputs[0].count = 999; expect(await hasRuntimeVerifiedEvidence(dataset)).toBe(false) })
  it('rejects item metadata tampering after promotion', async () => { const dataset = await promoteFixture(); dataset.items['3'].nameKo = '변조된 재료명'; expect(await hasRuntimeVerifiedEvidence(dataset)).toBe(false) })
})
