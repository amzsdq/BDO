import { describe, expect, it } from 'vitest'
import { applyKoreanNameEvidence } from './apply-korean-name-evidence.mjs'

const dataset = {
  metadata: { fingerprint: 'old', koreanNamesVerified: false },
  items: {
    '5401': { id: 5401, nameKo: '아이템 #5401', nameEn: 'Sunrise Herb' },
    '9001': { id: 9001, nameKo: '아이템 #9001', nameEn: 'Water' },
  },
}

describe('Korean item-name evidence', () => {
  it('binds names by canonical item id and marks complete coverage only when every scoped item is resolved', () => {
    const first = applyKoreanNameEvidence(dataset, { source: 'BDO Codex KR', collectedAt: '2026-09-23T00:00:00Z', items: [{ itemId: 5401, nameKo: '여명초', sourceUrl: 'https://bdocodex.com/kr/item/5401/' }] })
    expect(first.items['5401'].nameKo).toBe('여명초')
    expect(first.metadata.koreanNamesVerified).toBe(false)
    expect(first.metadata.fingerprint).toBeUndefined()
    expect(dataset.items['5401'].nameKo).toBe('아이템 #5401')

    const complete = applyKoreanNameEvidence(first, { source: 'BDO Codex KR', collectedAt: '2026-09-23T00:01:00Z', items: [{ itemId: 9001, nameKo: '요리용 생수', sourceUrl: 'https://bdocodex.com/kr/item/9001/' }] })
    expect(complete.metadata.koreanNamesVerified).toBe(true)
  })

  it('fails closed on mismatched canonical URL or placeholder evidence', () => {
    expect(() => applyKoreanNameEvidence(dataset, { source: 'BDO Codex KR', collectedAt: '2026-09-23T00:00:00Z', items: [{ itemId: 5401, nameKo: '여명초', sourceUrl: 'https://bdocodex.com/kr/item/9999/' }] })).toThrow(/canonical item id/)
    expect(() => applyKoreanNameEvidence(dataset, { source: 'BDO Codex KR', collectedAt: '2026-09-23T00:00:00Z', items: [{ itemId: 5401, nameKo: '아이템 #5401', sourceUrl: 'https://bdocodex.com/kr/item/5401/' }] })).toThrow(/invalid Korean display name/)
  })
})
