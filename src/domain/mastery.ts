export interface MasterySourceMeta {
  provider: 'Pearl Abyss'
  region: 'KR'
  sourceUrl: string
  sourceTitle: string
  sourceLastModified: string
  verifiedAt: string
}

export interface CookingMasteryRow { mastery: number; massCookingProbability: number }
export const COOKING_MASTERY_SOURCE: MasterySourceMeta = { provider: 'Pearl Abyss', region: 'KR', sourceUrl: 'https://www.kr.playblackdesert.com/ko-kr/News/Detail?countryType=ko-kr&groupContentNo=13398', sourceTitle: '[업데이트] 1월 8일(수) 업데이트 안내', sourceLastModified: '2025-02-12 11:56', verifiedAt: '2026-09-23' }
export const COOKING_MASTERY_ROWS: readonly CookingMasteryRow[] = [
  { mastery: 0, massCookingProbability: 0 }, { mastery: 50, massCookingProbability: 0.1089 }, { mastery: 100, massCookingProbability: 0.1176 }, { mastery: 150, massCookingProbability: 0.1267 }, { mastery: 200, massCookingProbability: 0.1362 }, { mastery: 250, massCookingProbability: 0.1459 }, { mastery: 300, massCookingProbability: 0.156 }, { mastery: 350, massCookingProbability: 0.1665 }, { mastery: 400, massCookingProbability: 0.1772 }, { mastery: 450, massCookingProbability: 0.1884 }, { mastery: 500, massCookingProbability: 0.1998 }, { mastery: 550, massCookingProbability: 0.2116 }, { mastery: 600, massCookingProbability: 0.2237 }, { mastery: 650, massCookingProbability: 0.2362 }, { mastery: 700, massCookingProbability: 0.249 }, { mastery: 750, massCookingProbability: 0.2621 }, { mastery: 800, massCookingProbability: 0.2756 }, { mastery: 850, massCookingProbability: 0.2894 }, { mastery: 900, massCookingProbability: 0.3058 }, { mastery: 950, massCookingProbability: 0.3226 }, { mastery: 1000, massCookingProbability: 0.3399 }, { mastery: 1050, massCookingProbability: 0.3576 }, { mastery: 1100, massCookingProbability: 0.3758 }, { mastery: 1150, massCookingProbability: 0.3944 }, { mastery: 1200, massCookingProbability: 0.4134 }, { mastery: 1250, massCookingProbability: 0.4422 }, { mastery: 1300, massCookingProbability: 0.472 }, { mastery: 1350, massCookingProbability: 0.5027 }, { mastery: 1400, massCookingProbability: 0.5344 }, { mastery: 1450, massCookingProbability: 0.567 }, { mastery: 1500, massCookingProbability: 0.6006 }, { mastery: 1550, massCookingProbability: 0.6352 }, { mastery: 1600, massCookingProbability: 0.6708 }, { mastery: 1650, massCookingProbability: 0.7073 }, { mastery: 1700, massCookingProbability: 0.7448 }, { mastery: 1750, massCookingProbability: 0.7832 }, { mastery: 1800, massCookingProbability: 0.8226 }, { mastery: 1850, massCookingProbability: 0.863 }, { mastery: 1900, massCookingProbability: 0.9044 }, { mastery: 1950, massCookingProbability: 0.995 }, { mastery: 2000, massCookingProbability: 1 }, { mastery: 2050, massCookingProbability: 1 }, { mastery: 2100, massCookingProbability: 1 }, { mastery: 2150, massCookingProbability: 1 }, { mastery: 2200, massCookingProbability: 1 }, { mastery: 2250, massCookingProbability: 1 }, { mastery: 2300, massCookingProbability: 1 }, { mastery: 2350, massCookingProbability: 1 }, { mastery: 2400, massCookingProbability: 1 }, { mastery: 2450, massCookingProbability: 1 }, { mastery: 2500, massCookingProbability: 1 }, { mastery: 2550, massCookingProbability: 1 }, { mastery: 2600, massCookingProbability: 1 }, { mastery: 2650, massCookingProbability: 1 }, { mastery: 2700, massCookingProbability: 1 }, { mastery: 2750, massCookingProbability: 1 }, { mastery: 2800, massCookingProbability: 1 }, { mastery: 2850, massCookingProbability: 1 }, { mastery: 2900, massCookingProbability: 1 }, { mastery: 2950, massCookingProbability: 1 }, { mastery: 3000, massCookingProbability: 1 },
]
export function cookingMasteryRow(mastery: number): CookingMasteryRow | undefined { return COOKING_MASTERY_ROWS.find((row) => row.mastery === mastery) }
export interface CookingMaterialForecast { durabilityUses: number; massCookingProbability: number; minimumServings: number; expectedServings: number; safe95Servings: number; safe95Method: 'exact-binomial' | 'bernstein-conservative'; maximumServings: number }
const EXACT_BINOMIAL_MAX_USES = 100_000
function binomialQuantile95(n: number, p: number): number {
  if (p <= 0) return 0; if (p >= 1) return n
  const mode = Math.floor((n + 1) * p); let totalRelative = 1; let weight = 1
  for (let k = mode; k > 0; k -= 1) { weight *= (k / (n - k + 1)) * ((1 - p) / p); totalRelative += weight }
  let upperTailRelative = 0; weight = 1
  for (let k = mode; k < n; k += 1) { weight *= ((n - k) / (k + 1)) * (p / (1 - p)); upperTailRelative += weight; totalRelative += weight }
  let quantile = mode; let tailRelative = upperTailRelative; weight = 1
  while (quantile < n && tailRelative / totalRelative > 0.05) { const previous = quantile; quantile += 1; weight *= ((n - previous) / quantile) * (p / (1 - p)); tailRelative = Math.max(0, tailRelative - weight) }
  return quantile
}
function bernsteinUpper95(n: number, p: number): number {
  if (p <= 0) return 0; if (p >= 1) return n
  const log20 = Math.log(20); const variance = n * p * (1 - p); const third = log20 / 3
  return Math.min(n, Math.ceil(n * p + third + Math.sqrt(third * third + 2 * log20 * variance)))
}
export function forecastCookingMaterialServings(durabilityUses: number, mastery: number): CookingMaterialForecast | undefined {
  if (!Number.isInteger(durabilityUses) || durabilityUses < 0) throw new Error('durabilityUses must be a non-negative integer')
  const row = cookingMasteryRow(mastery); if (!row) return undefined
  const p = row.massCookingProbability
  const useExact = durabilityUses <= EXACT_BINOMIAL_MAX_USES || p <= 0 || p >= 1
  const safe95MassProcs = useExact ? binomialQuantile95(durabilityUses, p) : bernsteinUpper95(durabilityUses, p)
  return { durabilityUses, massCookingProbability: p, minimumServings: durabilityUses, expectedServings: durabilityUses * (1 + 9 * p), safe95Servings: durabilityUses + 9 * safe95MassProcs, safe95Method: useExact ? 'exact-binomial' : 'bernstein-conservative', maximumServings: durabilityUses * 10 }
}
