import { describe, expect, it } from 'vitest'
import { assertKoreanNameReleaseEvidence } from './korean-name-release-evidence.mjs'

function dataset() {
  return {
    metadata: {
      koreanNamesVerified: true,
      koreanNameEvidence: {
        provider: 'BDO Codex KR',
        collectedAt: '2026-09-23T00:00:00Z',
        count: 2,
      },
    },
    items: {
      '10': { id: 10, nameKo: '맥주' },
      '20': { id: 20, nameKo: '곡물' },
    },
  }
}

describe('Korean-name release evidence', () => {
  it('accepts complete Codex KR evidence bound to every dataset item', () => {
    expect(assertKoreanNameReleaseEvidence(dataset())).toEqual({
      provider: 'BDO Codex KR',
      collectedAt: '2026-09-23T00:00:00Z',
      count: 2,
    })
  })

  it('rejects a dataset that merely contains non-placeholder names without verification', () => {
    const value = dataset()
    delete value.metadata.koreanNamesVerified
    expect(() => assertKoreanNameReleaseEvidence(value)).toThrow(/not verified/)
  })

  it('rejects non-Codex provenance', () => {
    const value = dataset()
    value.metadata.koreanNameEvidence.provider = 'manual'
    expect(() => assertKoreanNameReleaseEvidence(value)).toThrow(/BDO Codex KR/)
  })

  it('rejects partial evidence even when all current names look resolved', () => {
    const value = dataset()
    value.metadata.koreanNameEvidence.count = 1
    expect(() => assertKoreanNameReleaseEvidence(value)).toThrow(/does not match dataset item count/)
  })

  it('rejects invalid evidence timestamps', () => {
    const value = dataset()
    value.metadata.koreanNameEvidence.collectedAt = 'not-a-date'
    expect(() => assertKoreanNameReleaseEvidence(value)).toThrow(/collectedAt/)
  })

  it('rejects unresolved placeholders even if metadata claims verification', () => {
    const value = dataset()
    value.items['20'].nameKo = '아이템 #20'
    expect(() => assertKoreanNameReleaseEvidence(value)).toThrow(/unresolved Korean names/)
  })
})
