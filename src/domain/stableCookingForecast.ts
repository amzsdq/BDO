import { cookingMasteryRow, type CookingMaterialForecast } from './mastery'

/**
 * Exact 95% binomial quantile using probabilities relative to the distribution
 * mode. Starting at the mode avoids the P(X=0) underflow that occurs for large
 * durability counts while retaining an exact discrete percentile.
 */
function stableBinomialQuantile95(n: number, p: number): number {
  if (p <= 0) return 0
  if (p >= 1) return n

  const mode = Math.floor((n + 1) * p)
  let totalRelative = 1

  let weight = 1
  for (let k = mode; k > 0; k -= 1) {
    weight *= (k / (n - k + 1)) * ((1 - p) / p)
    totalRelative += weight
  }

  let upperTailRelative = 0
  weight = 1
  for (let k = mode; k < n; k += 1) {
    weight *= ((n - k) / (k + 1)) * (p / (1 - p))
    upperTailRelative += weight
    totalRelative += weight
  }

  let quantile = mode
  let tailRelative = upperTailRelative
  weight = 1
  while (quantile < n && tailRelative / totalRelative > 0.05) {
    const previous = quantile
    quantile += 1
    weight *= ((n - previous) / quantile) * (p / (1 - p))
    tailRelative = Math.max(0, tailRelative - weight)
  }
  return quantile
}

export function stableForecastCookingMaterialServings(
  durabilityUses: number,
  mastery: number,
): CookingMaterialForecast | undefined {
  if (!Number.isInteger(durabilityUses) || durabilityUses < 0) throw new Error('durabilityUses must be a non-negative integer')
  const row = cookingMasteryRow(mastery)
  if (!row) return undefined
  const p = row.massCookingProbability
  const safe95MassProcs = stableBinomialQuantile95(durabilityUses, p)
  return {
    durabilityUses,
    massCookingProbability: p,
    minimumServings: durabilityUses,
    expectedServings: durabilityUses * (1 + 9 * p),
    safe95Servings: durabilityUses + 9 * safe95MassProcs,
    maximumServings: durabilityUses * 10,
  }
}
