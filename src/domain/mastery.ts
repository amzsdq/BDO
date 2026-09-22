export interface MasterySourceMeta {
  provider: 'Pearl Abyss'
  region: 'KR'
  sourceUrl: string
  sourceTitle: string
  sourceLastModified: string
  verifiedAt: string
}

export interface CookingMasteryRow {
  mastery: number
  massCookingProbability: number
}

export const COOKING_MASTERY_SOURCE: MasterySourceMeta = {
  provider: 'Pearl Abyss',
  region: 'KR',
  sourceUrl: 'https://www.kr.playblackdesert.com/ko-kr/News/Detail?countryType=ko-kr&groupContentNo=13398',
  sourceTitle: '[업데이트] 1월 8일(수) 업데이트 안내',
  sourceLastModified: '2025-02-12 11:56',
  verifiedAt: '2026-09-22',
}

/**
 * Verified rows from Pearl Abyss KR's published Cooking mastery table.
 * This slice deliberately contains only rows transcribed and reviewed in-project.
 * Unknown mastery values return undefined instead of being interpolated.
 */
export const COOKING_MASTERY_ROWS: readonly CookingMasteryRow[] = [
  { mastery: 1050, massCookingProbability: 0.3576 },
  { mastery: 1100, massCookingProbability: 0.3758 },
  { mastery: 1150, massCookingProbability: 0.3944 },
  { mastery: 1200, massCookingProbability: 0.4134 },
  { mastery: 1250, massCookingProbability: 0.4422 },
  { mastery: 1300, massCookingProbability: 0.472 },
  { mastery: 1350, massCookingProbability: 0.5027 },
  { mastery: 1400, massCookingProbability: 0.5344 },
  { mastery: 1450, massCookingProbability: 0.567 },
  { mastery: 1500, massCookingProbability: 0.6006 },
  { mastery: 1550, massCookingProbability: 0.6352 },
  { mastery: 1600, massCookingProbability: 0.6708 },
  { mastery: 1650, massCookingProbability: 0.7073 },
  { mastery: 1700, massCookingProbability: 0.7448 },
  { mastery: 1750, massCookingProbability: 0.7832 },
  { mastery: 1800, massCookingProbability: 0.8226 },
  { mastery: 1850, massCookingProbability: 0.863 },
  { mastery: 1900, massCookingProbability: 0.9044 },
  { mastery: 1950, massCookingProbability: 0.995 },
  { mastery: 2000, massCookingProbability: 1 },
  { mastery: 2050, massCookingProbability: 1 },
  { mastery: 2100, massCookingProbability: 1 },
  { mastery: 2150, massCookingProbability: 1 },
  { mastery: 2200, massCookingProbability: 1 },
  { mastery: 2250, massCookingProbability: 1 },
  { mastery: 2300, massCookingProbability: 1 },
  { mastery: 2350, massCookingProbability: 1 },
  { mastery: 2400, massCookingProbability: 1 },
  { mastery: 2450, massCookingProbability: 1 },
  { mastery: 2500, massCookingProbability: 1 },
  { mastery: 2550, massCookingProbability: 1 },
  { mastery: 2600, massCookingProbability: 1 },
  { mastery: 2650, massCookingProbability: 1 },
  { mastery: 2700, massCookingProbability: 1 },
  { mastery: 2750, massCookingProbability: 1 },
  { mastery: 2800, massCookingProbability: 1 },
  { mastery: 2850, massCookingProbability: 1 },
  { mastery: 2900, massCookingProbability: 1 },
  { mastery: 2950, massCookingProbability: 1 },
  { mastery: 3000, massCookingProbability: 1 },
]

export function cookingMasteryRow(mastery: number): CookingMasteryRow | undefined {
  return COOKING_MASTERY_ROWS.find((row) => row.mastery === mastery)
}

export interface CookingMaterialForecast {
  durabilityUses: number
  massCookingProbability: number
  minimumServings: number
  expectedServings: number
  maximumServings: number
}

/**
 * Pearl Abyss' Cooking guide verifies that Mass Cooking consumes 10 servings of
 * materials and produces 10 servings while consuming one utensil durability.
 * A normal use consumes one serving. Expected value is therefore 1 + 9p.
 * This forecast is only emitted for an exact, source-verified mastery row.
 */
export function forecastCookingMaterialServings(
  durabilityUses: number,
  mastery: number,
): CookingMaterialForecast | undefined {
  if (!Number.isInteger(durabilityUses) || durabilityUses < 0) {
    throw new Error('durabilityUses must be a non-negative integer')
  }
  const row = cookingMasteryRow(mastery)
  if (!row) return undefined
  const p = row.massCookingProbability
  return {
    durabilityUses,
    massCookingProbability: p,
    minimumServings: durabilityUses,
    expectedServings: durabilityUses * (1 + 9 * p),
    maximumServings: durabilityUses * 10,
  }
}
