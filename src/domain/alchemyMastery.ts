import type { MasterySourceMeta } from './mastery'

export interface AlchemyMasteryRow {
  mastery: number
  maxOutputProbability: number
  normalExtraProbability: number
  specialExtraProbability: number
  rareExtraProbability: number
}

export const ALCHEMY_MASTERY_SOURCE: MasterySourceMeta = {
  provider: 'Pearl Abyss',
  region: 'KR',
  sourceUrl: 'https://www.kr.playblackdesert.com/ko-kr/News/Detail?countryType=ko-kr&groupContentNo=13398',
  sourceTitle: '[업데이트] 1월 8일(수) 업데이트 안내',
  sourceLastModified: '2025-02-12 11:56',
  verifiedAt: '2026-09-23',
}

/**
 * Source-verified upper mastery breakpoints from Pearl Abyss KR.
 * This intentionally does NOT claim completeness yet: lower rows remain a release
 * blocker until transcribed and independently checked. Off-grid values are never
 * interpolated. Percentages are stored as probabilities in [0, 1].
 */
export const VERIFIED_ALCHEMY_MASTERY_ROWS: readonly AlchemyMasteryRow[] = [
  { mastery: 2050, maxOutputProbability: 0.5063, normalExtraProbability: 0.0359, specialExtraProbability: 0.0197, rareExtraProbability: 0.0023 },
  { mastery: 2100, maxOutputProbability: 0.5125, normalExtraProbability: 0.0361, specialExtraProbability: 0.0202, rareExtraProbability: 0.0024 },
  { mastery: 2150, maxOutputProbability: 0.5188, normalExtraProbability: 0.0363, specialExtraProbability: 0.0207, rareExtraProbability: 0.0025 },
  { mastery: 2200, maxOutputProbability: 0.5250, normalExtraProbability: 0.0364, specialExtraProbability: 0.0212, rareExtraProbability: 0.0025 },
  { mastery: 2250, maxOutputProbability: 0.5313, normalExtraProbability: 0.0366, specialExtraProbability: 0.0217, rareExtraProbability: 0.0026 },
  { mastery: 2300, maxOutputProbability: 0.5375, normalExtraProbability: 0.0368, specialExtraProbability: 0.0222, rareExtraProbability: 0.0026 },
  { mastery: 2350, maxOutputProbability: 0.5438, normalExtraProbability: 0.0369, specialExtraProbability: 0.0227, rareExtraProbability: 0.0027 },
  { mastery: 2400, maxOutputProbability: 0.5500, normalExtraProbability: 0.0370, specialExtraProbability: 0.0232, rareExtraProbability: 0.0028 },
  { mastery: 2450, maxOutputProbability: 0.5563, normalExtraProbability: 0.0372, specialExtraProbability: 0.0237, rareExtraProbability: 0.0028 },
  { mastery: 2500, maxOutputProbability: 0.5625, normalExtraProbability: 0.0373, specialExtraProbability: 0.0242, rareExtraProbability: 0.0029 },
  { mastery: 2550, maxOutputProbability: 0.5688, normalExtraProbability: 0.0374, specialExtraProbability: 0.0248, rareExtraProbability: 0.0030 },
  { mastery: 2600, maxOutputProbability: 0.5750, normalExtraProbability: 0.0376, specialExtraProbability: 0.0253, rareExtraProbability: 0.0030 },
  { mastery: 2650, maxOutputProbability: 0.5813, normalExtraProbability: 0.0377, specialExtraProbability: 0.0258, rareExtraProbability: 0.0031 },
  { mastery: 2700, maxOutputProbability: 0.5875, normalExtraProbability: 0.0378, specialExtraProbability: 0.0264, rareExtraProbability: 0.0032 },
  { mastery: 2750, maxOutputProbability: 0.5938, normalExtraProbability: 0.0379, specialExtraProbability: 0.0269, rareExtraProbability: 0.0032 },
  { mastery: 2800, maxOutputProbability: 0.6000, normalExtraProbability: 0.0380, specialExtraProbability: 0.0275, rareExtraProbability: 0.0033 },
  { mastery: 2850, maxOutputProbability: 0.6063, normalExtraProbability: 0.0380, specialExtraProbability: 0.0280, rareExtraProbability: 0.0033 },
  { mastery: 2900, maxOutputProbability: 0.6125, normalExtraProbability: 0.0381, specialExtraProbability: 0.0286, rareExtraProbability: 0.0034 },
  { mastery: 2950, maxOutputProbability: 0.6188, normalExtraProbability: 0.0382, specialExtraProbability: 0.0292, rareExtraProbability: 0.0035 },
  { mastery: 3000, maxOutputProbability: 0.6250, normalExtraProbability: 0.0383, specialExtraProbability: 0.0298, rareExtraProbability: 0.0036 },
]

export function verifiedAlchemyMasteryRow(mastery: number): AlchemyMasteryRow | undefined {
  return VERIFIED_ALCHEMY_MASTERY_ROWS.find((row) => row.mastery === mastery)
}
