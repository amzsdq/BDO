import fs from 'node:fs'

function fail(message) { throw new Error(message) }
function finitePositive(value, field) { const number = Number(value); if (!Number.isFinite(number) || number <= 0) fail(`${field} must be a positive finite number`); return number }

export function applyYieldEvidence(dataset, evidence) {
  if (!dataset?.recipes || !dataset?.metadata) fail('dataset recipes/metadata required')
  if (!evidence || !Array.isArray(evidence.entries) || !evidence.entries.length) fail('yield evidence entries required')
  const seen = new Set()
  const recipes = { ...dataset.recipes }
  for (const entry of evidence.entries) {
    const recipeId = String(entry?.recipeId ?? '').trim()
    if (!recipeId || seen.has(recipeId)) fail(`duplicate or empty recipeId: ${recipeId || '<empty>'}`)
    seen.add(recipeId)
    const recipe = recipes[recipeId]
    if (!recipe) fail(`yield evidence references unknown recipe: ${recipeId}`)
    const min = finitePositive(entry.min, `${recipeId}.min`)
    const max = finitePositive(entry.max, `${recipeId}.max`)
    const expected = entry.expected == null ? undefined : finitePositive(entry.expected, `${recipeId}.expected`)
    if (min > max) fail(`${recipeId}: min exceeds max`)
    if (expected != null && (expected < min || expected > max)) fail(`${recipeId}: expected must be between min and max`)
    const sourceUrl = String(entry.sourceUrl ?? '').trim()
    if (!/^https:\/\//.test(sourceUrl)) fail(`${recipeId}: sourceUrl must be an https URL`)
    recipes[recipeId] = { ...recipe, yield: { min, ...(expected == null ? {} : { expected }), max, provenance: sourceUrl } }
  }
  const metadata = { ...dataset.metadata, yieldEvidenceApplied: true, yieldEvidenceCount: seen.size, yieldEvidenceSource: String(evidence.source ?? '').trim() || undefined }
  delete metadata.fingerprint
  return { ...dataset, recipes, metadata }
}

if (process.argv[1]?.endsWith('apply-yield-evidence.mjs') && process.argv.length >= 5) {
  const [, , datasetPath, evidencePath, outPath] = process.argv
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  const enriched = applyYieldEvidence(dataset, evidence)
  fs.writeFileSync(outPath, JSON.stringify(enriched, null, 2) + '\n')
  console.log(JSON.stringify({ ok: true, yieldEvidenceCount: enriched.metadata.yieldEvidenceCount }))
}
