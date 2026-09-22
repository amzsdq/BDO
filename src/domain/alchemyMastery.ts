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
 * Source-verified Alchemy mastery breakpoints from Pearl Abyss KR.
 * The official table publishes every 50 mastery from 0 through 3000.
 * Off-grid values are never interpolated. Percentages are stored as
 * probabilities in [0, 1].
 */
export const VERIFIED_ALCHEMY_MASTERY_ROWS: readonly AlchemyMasteryRow[] = [
  { mastery: 0, maxOutputProbability: 0.0000, normalExtraProbability: 0.0025, specialExtraProbability: 0.0004, rareExtraProbability: 0.0001 },
  { mastery: 50, maxOutputProbability: 0.0576, normalExtraProbability: 0.0028, specialExtraProbability: 0.0005, rareExtraProbability: 0.0001 },
  { mastery: 100, maxOutputProbability: 0.0635, normalExtraProbability: 0.0032, specialExtraProbability: 0.0006, rareExtraProbability: 0.0001 },
  { mastery: 150, maxOutputProbability: 0.0697, normalExtraProbability: 0.0037, specialExtraProbability: 0.0007, rareExtraProbability: 0.0001 },
  { mastery: 200, maxOutputProbability: 0.0762, normalExtraProbability: 0.0042, specialExtraProbability: 0.0009, rareExtraProbability: 0.0001 },
  { mastery: 250, maxOutputProbability: 0.0829, normalExtraProbability: 0.0047, specialExtraProbability: 0.0010, rareExtraProbability: 0.0001 },
  { mastery: 300, maxOutputProbability: 0.0900, normalExtraProbability: 0.0053, specialExtraProbability: 0.0012, rareExtraProbability: 0.0002 },
  { mastery: 350, maxOutputProbability: 0.0973, normalExtraProbability: 0.0059, specialExtraProbability: 0.0013, rareExtraProbability: 0.0002 },
  { mastery: 400, maxOutputProbability: 0.1050, normalExtraProbability: 0.0065, specialExtraProbability: 0.0015, rareExtraProbability: 0.0002 },
  { mastery: 450, maxOutputProbability: 0.1129, normalExtraProbability: 0.0071, specialExtraProbability: 0.0017, rareExtraProbability: 0.0002 },
  { mastery: 500, maxOutputProbability: 0.1211, normalExtraProbability: 0.0078, specialExtraProbability: 0.0019, rareExtraProbability: 0.0002 },
  { mastery: 550, maxOutputProbability: 0.1296, normalExtraProbability: 0.0085, specialExtraProbability: 0.0022, rareExtraProbability: 0.0003 },
  { mastery: 600, maxOutputProbability: 0.1384, normalExtraProbability: 0.0092, specialExtraProbability: 0.0024, rareExtraProbability: 0.0003 },
  { mastery: 650, maxOutputProbability: 0.1475, normalExtraProbability: 0.0099, specialExtraProbability: 0.0027, rareExtraProbability: 0.0003 },
  { mastery: 700, maxOutputProbability: 0.1568, normalExtraProbability: 0.0107, specialExtraProbability: 0.0030, rareExtraProbability: 0.0004 },
  { mastery: 750, maxOutputProbability: 0.1665, normalExtraProbability: 0.0114, specialExtraProbability: 0.0033, rareExtraProbability: 0.0004 },
  { mastery: 800, maxOutputProbability: 0.1764, normalExtraProbability: 0.0122, specialExtraProbability: 0.0037, rareExtraProbability: 0.0005 },
  { mastery: 850, maxOutputProbability: 0.1866, normalExtraProbability: 0.0130, specialExtraProbability: 0.0040, rareExtraProbability: 0.0005 },
  { mastery: 900, maxOutputProbability: 0.1971, normalExtraProbability: 0.0139, specialExtraProbability: 0.0044, rareExtraProbability: 0.0005 },
  { mastery: 950, maxOutputProbability: 0.2079, normalExtraProbability: 0.0147, specialExtraProbability: 0.0048, rareExtraProbability: 0.0006 },
  { mastery: 1000, maxOutputProbability: 0.2190, normalExtraProbability: 0.0156, specialExtraProbability: 0.0052, rareExtraProbability: 0.0006 },
  { mastery: 1050, maxOutputProbability: 0.2304, normalExtraProbability: 0.0165, specialExtraProbability: 0.0056, rareExtraProbability: 0.0007 },
  { mastery: 1100, maxOutputProbability: 0.2421, normalExtraProbability: 0.0174, specialExtraProbability: 0.0061, rareExtraProbability: 0.0008 },
  { mastery: 1150, maxOutputProbability: 0.2540, normalExtraProbability: 0.0183, specialExtraProbability: 0.0066, rareExtraProbability: 0.0008 },
  { mastery: 1200, maxOutputProbability: 0.2663, normalExtraProbability: 0.0192, specialExtraProbability: 0.0071, rareExtraProbability: 0.0009 },
  { mastery: 1250, maxOutputProbability: 0.2788, normalExtraProbability: 0.0202, specialExtraProbability: 0.0077, rareExtraProbability: 0.0009 },
  { mastery: 1300, maxOutputProbability: 0.2916, normalExtraProbability: 0.0211, specialExtraProbability: 0.0082, rareExtraProbability: 0.0010 },
  { mastery: 1350, maxOutputProbability: 0.3047, normalExtraProbability: 0.0221, specialExtraProbability: 0.0088, rareExtraProbability: 0.0011 },
  { mastery: 1400, maxOutputProbability: 0.3181, normalExtraProbability: 0.0231, specialExtraProbability: 0.0094, rareExtraProbability: 0.0011 },
  { mastery: 1450, maxOutputProbability: 0.3318, normalExtraProbability: 0.0241, specialExtraProbability: 0.0101, rareExtraProbability: 0.0012 },
  { mastery: 1500, maxOutputProbability: 0.3457, normalExtraProbability: 0.0251, specialExtraProbability: 0.0108, rareExtraProbability: 0.0013 },
  { mastery: 1550, maxOutputProbability: 0.3600, normalExtraProbability: 0.0262, specialExtraProbability: 0.0115, rareExtraProbability: 0.0014 },
  { mastery: 1600, maxOutputProbability: 0.3745, normalExtraProbability: 0.0272, specialExtraProbability: 0.0122, rareExtraProbability: 0.0015 },
  { mastery: 1650, maxOutputProbability: 0.3894, normalExtraProbability: 0.0282, specialExtraProbability: 0.0130, rareExtraProbability: 0.0016 },
  { mastery: 1700, maxOutputProbability: 0.4045, normalExtraProbability: 0.0293, specialExtraProbability: 0.0138, rareExtraProbability: 0.0017 },
  { mastery: 1750, maxOutputProbability: 0.4199, normalExtraProbability: 0.0303, specialExtraProbability: 0.0146, rareExtraProbability: 0.0018 },
  { mastery: 1800, maxOutputProbability: 0.4356, normalExtraProbability: 0.0314, specialExtraProbability: 0.0155, rareExtraProbability: 0.0019 },
  { mastery: 1850, maxOutputProbability: 0.4516, normalExtraProbability: 0.0325, specialExtraProbability: 0.0164, rareExtraProbability: 0.0020 },
  { mastery: 1900, maxOutputProbability: 0.4679, normalExtraProbability: 0.0336, specialExtraProbability: 0.0173, rareExtraProbability: 0.0021 },
  { mastery: 1950, maxOutputProbability: 0.4844, normalExtraProbability: 0.0347, specialExtraProbability: 0.0183, rareExtraProbability: 0.0022 },
  { mastery: 2000, maxOutputProbability: 0.5000, normalExtraProbability: 0.0357, specialExtraProbability: 0.0192, rareExtraProbability: 0.0023 },
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
