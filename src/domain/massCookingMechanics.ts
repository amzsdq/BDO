export const MASS_COOKING_MECHANICS = {
  minimumContinuousCrafts: 10,
  servingsPerActivation: 10,
  durabilityPerActivation: 1,
  source: {
    provider: 'Pearl Abyss' as const,
    region: 'KR' as const,
    sourceUrl: 'https://www.kr.playblackdesert.com/ko-KR/Wiki?wikiNo=102',
    sourceTitle: '[모험가 가이드] 요리',
    sourceSection: '4. 대량 요리와 부산물(마녀의 별미)',
    verifiedAt: '2026-09-23',
  },
} as const

/** Extra material servings consumed by one Mass Cooking activation beyond the normal craft. */
export const MASS_COOKING_EXTRA_SERVINGS = MASS_COOKING_MECHANICS.servingsPerActivation - 1
