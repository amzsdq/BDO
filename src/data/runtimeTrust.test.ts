import { describe, expect, it } from 'vitest'
import type { RecipeDataset } from '../domain/types'
import { hasRuntimeVerifiedEvidence } from './runtimeTrust'

function fixture(): RecipeDataset {
  return {
    metadata: {
      generatedAt: '2026-09-23T00:00:00Z', supportedRegion: 'KR',
      sources: ['client', 'codex'], status: 'COMPLETE_VERIFIED', reconciliationStatus: 'ZERO_UNEXPLAINED_DIFF',
      verifiedAt: '2026-09-23T00:01:00Z', fingerprint: 'abc', counts: { cooking: 1, alchemy: 1 },
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

describe('hasRuntimeVerifiedEvidence', () => {
  it('accepts a structurally consistent promoted marker set', () => expect(hasRuntimeVerifiedEvidence(fixture())).toBe(true))
  it('rejects status-only claims', () => { const d = fixture(); delete (d.metadata as any).reconciliationStatus; expect(hasRuntimeVerifiedEvidence(d)).toBe(false) })
  it('rejects stale recipe counts', () => { const d = fixture(); (d.metadata as any).counts.cooking = 2; expect(hasRuntimeVerifiedEvidence(d)).toBe(false) })
  it('rejects unresolved names and icons', () => {
    const a = fixture(); a.items['3'].nameKo = '아이템 #3'; expect(hasRuntimeVerifiedEvidence(a)).toBe(false)
    const b = fixture(); delete b.items['3'].iconPath; expect(hasRuntimeVerifiedEvidence(b)).toBe(false)
  })
})
