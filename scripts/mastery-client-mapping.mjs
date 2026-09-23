export const CLIENT_MASTERY_MAPPING_PROVENANCE = {
  source: 'marceloclp/calpheonlabs client-table evidence ledger',
  revision: '163f8b6252d313fa410adc0f97818c5f58919013',
  cookingReviewed: '2026-08-03',
  alchemyReviewed: '2026-07-17',
}

/** Map extractor cookingstatdata raw columns to the named Mass Cooking probability. */
export function cookingClientNamedEffects(row) {
  if (!Array.isArray(row?.rates) || row.rates.length !== 5) throw new Error('Cooking client row must contain 5 raw rates')
  return { mastery: Number(row.mastery), massCookingProbability: Number(row.rates[3]) }
}

/**
 * Map extractor alchemystatdata raw layout. The current extractor divides every
 * post-mastery u32 by 1e6, including the three channel keys, so keys are restored
 * to integers here while actual rates remain probabilities.
 */
export function alchemyClientNamedEffects(row) {
  if (!Array.isArray(row?.rates) || row.rates.length !== 9) throw new Error('Alchemy client row must contain 9 raw values')
  const [maxOutputProbability, _royalBonus, commonKeyScaled, commonConditional, specialKeyScaled, specialConditional, rareKeyScaled, rareConditional, eventRate] = row.rates.map(Number)
  if (![maxOutputProbability, commonKeyScaled, commonConditional, specialKeyScaled, specialConditional, rareKeyScaled, rareConditional, eventRate].every(Number.isFinite)) throw new Error('Alchemy client row contains non-finite raw values')
  const channelKeys = [commonKeyScaled, specialKeyScaled, rareKeyScaled].map((value) => Math.round(value * 1e6))
  if (JSON.stringify(channelKeys) !== JSON.stringify([15690, 15691, 15692])) throw new Error('Alchemy client event channel keys are unexpected')
  if (commonConditional !== 1) throw new Error('Alchemy common channel conditional rate must be 1')
  const normalExtraProbability = eventRate * (1 - rareConditional) * (1 - specialConditional)
  const specialExtraProbability = eventRate * (1 - rareConditional) * specialConditional
  const rareExtraProbability = eventRate * rareConditional
  return { mastery: Number(row.mastery), maxOutputProbability, normalExtraProbability, specialExtraProbability, rareExtraProbability, channelKeys }
}
