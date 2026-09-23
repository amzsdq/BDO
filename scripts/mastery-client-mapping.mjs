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
 * Map extractor alchemystatdata raw layout:
 * [productAmount, royalBonus, commonKey, commonConditional,
 *  specialKey, specialConditional, rareKey, rareConditional, eventRate].
 * Published extra-item probabilities are derived by the client formulas documented
 * from panel_characterinfo_life_all_2.luac.
 */
export function alchemyClientNamedEffects(row) {
  if (!Array.isArray(row?.rates) || row.rates.length !== 9) throw new Error('Alchemy client row must contain 9 raw rates')
  const [maxOutputProbability, _royalBonus, commonKey, commonConditional, specialKey, specialConditional, rareKey, rareConditional, eventRate] = row.rates.map(Number)
  if (![maxOutputProbability, commonKey, commonConditional, specialKey, specialConditional, rareKey, rareConditional, eventRate].every(Number.isFinite)) throw new Error('Alchemy client row contains non-finite raw rates')
  if (commonConditional !== 1) throw new Error('Alchemy common channel conditional rate must be 1')
  const normalExtraProbability = eventRate * (1 - rareConditional) * (1 - specialConditional)
  const specialExtraProbability = eventRate * (1 - rareConditional) * specialConditional
  const rareExtraProbability = eventRate * rareConditional
  return { mastery: Number(row.mastery), maxOutputProbability, normalExtraProbability, specialExtraProbability, rareExtraProbability, channelKeys: [commonKey, specialKey, rareKey] }
}
