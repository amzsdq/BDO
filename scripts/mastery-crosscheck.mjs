import { alchemyClientNamedEffects, cookingClientNamedEffects } from './mastery-client-mapping.mjs'

const EPSILON = 1e-9

function finiteNumber(value, label) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite`)
  return number
}

function byMastery(rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${label} rows are required`)
  const map = new Map()
  for (const row of rows) {
    const mastery = finiteNumber(row?.mastery, `${label} mastery`)
    if (map.has(mastery)) throw new Error(`${label} contains duplicate mastery ${mastery}`)
    map.set(mastery, row)
  }
  return map
}

function same(a, b) {
  return Math.abs(finiteNumber(a, 'actual rate') - finiteNumber(b, 'expected rate')) <= EPSILON
}

function compareFields(clientRows, runtimeRows, mapper, fields, skill) {
  const client = byMastery(clientRows, `${skill} client`)
  const runtime = byMastery(runtimeRows, `${skill} runtime`)
  const masterySetMatches = client.size === runtime.size && [...client.keys()].every((mastery) => runtime.has(mastery))
  const mismatches = []

  if (masterySetMatches) {
    for (const [mastery, raw] of client) {
      const mapped = mapper(raw)
      const expected = runtime.get(mastery)
      for (const field of fields) {
        if (!same(mapped[field], expected[field])) {
          mismatches.push({ mastery, field, client: mapped[field], runtime: expected[field] })
        }
      }
    }
  }

  return { skill, masterySetMatches, clientRowCount: client.size, runtimeRowCount: runtime.size, mismatches, pass: masterySetMatches && mismatches.length === 0 }
}

export function compareMasteryCurves({ cookingClientRows, alchemyClientRows, cookingRuntimeRows, alchemyRuntimeRows }) {
  const cooking = compareFields(cookingClientRows, cookingRuntimeRows, cookingClientNamedEffects, ['massCookingProbability'], 'Cooking')
  const alchemy = compareFields(alchemyClientRows, alchemyRuntimeRows, alchemyClientNamedEffects, ['maxOutputProbability', 'normalExtraProbability', 'specialExtraProbability', 'rareExtraProbability'], 'Alchemy')
  return { cooking, alchemy, pass: cooking.pass && alchemy.pass }
}

export function assertMasteryCurvesMatch(input) {
  const result = compareMasteryCurves(input)
  if (!result.pass) {
    const details = [result.cooking, result.alchemy]
      .filter((part) => !part.pass)
      .map((part) => `${part.skill}: masterySetMatches=${part.masterySetMatches}, mismatches=${part.mismatches.length}`)
      .join('; ')
    throw new Error(`Client mastery cross-check failed: ${details}`)
  }
  return result
}
