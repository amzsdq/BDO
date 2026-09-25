import fs from 'node:fs'

function fail(message) { throw new Error(message) }
function finitePositive(value, field) { const number = Number(value); if (!Number.isFinite(number) || number <= 0) fail(`${field} must be a positive finite number`); return number }
function codexRecipeId(value) { const match = String(value ?? '').trim().match(/^https:\/\/(?:www\.)?bdocodex\.com\/kr\/recipe\/(\d+)\/?$/i); return match ? Number(match[1]) : null }

export function applyYieldEvidence(dataset, evidence) {
  if (!dataset?.recipes || !dataset?.metadata) fail('dataset recipes/metadata required')
  if (!evidence || !Array.isArray(evidence.entries) || !evidence.entries.length) fail('yield evidence entries required')
  const seen = new Set()
  const recipes = { ...dataset.recipes }
  for (const entry of evidence.entries) {
    const recipeId = String(entry?.recipeId ?? '').trim()
    const variantId = String(entry?.variantId ?? '').trim()
    const evidenceKey = variantId ? `${recipeId}:${variantId}` : recipeId
    if (!recipeId || seen.has(evidenceKey)) fail(`duplicate or empty evidence key: ${evidenceKey || '<empty>'}`)
    seen.add(evidenceKey)
    const recipe = recipes[recipeId]
    if (!recipe) fail(`yield evidence references unknown recipe: ${recipeId}`)
    const min = finitePositive(entry.min, `${recipeId}.min`)
    const max = finitePositive(entry.max, `${recipeId}.max`)
    const expected = entry.expected == null ? undefined : finitePositive(entry.expected, `${recipeId}.expected`)
    if (min > max) fail(`${recipeId}: min exceeds max`)
    if (expected != null && (expected < min || expected > max)) fail(`${recipeId}: expected must be between min and max`)
    const sourceUrl = String(entry.sourceUrl ?? '').trim()
    const sourceRecipeId = Number(entry.sourceRecipeId)
    if (!Number.isSafeInteger(sourceRecipeId) || sourceRecipeId <= 0 || codexRecipeId(sourceUrl) !== sourceRecipeId) fail(`${recipeId}: sourceUrl/sourceRecipeId must identify the same BDO Codex KR recipe`)
    if (variantId) {
      let matched = false
      const variants = (recipe.variants ?? []).map((variant) => {
        if (variant.id !== variantId) return variant
        matched = true
        return { ...variant, sourceRecipeId, yield: { min, ...(expected == null ? {} : { expected }), max, provenance: sourceUrl } }
      })
      if (!matched) fail(`${recipeId}: unknown variantId ${variantId}`)
      recipes[recipeId] = { ...recipe, variants }
    } else recipes[recipeId] = { ...recipe, yield: { min, ...(expected == null ? {} : { expected }), max, provenance: sourceUrl, sourceRecipeId } }
  }
  const metadata = { ...dataset.metadata, yieldEvidenceApplied: true, yieldEvidenceCount: seen.size, yieldEvidenceSource: String(evidence.source ?? '').trim() || undefined }
  delete metadata.fingerprint
  return { ...dataset, recipes, metadata }
}

if (process.argv[1]?.endsWith('apply-yield-evidence.mjs')) {
  if (process.argv.length !== 5) fail('usage: node scripts/apply-yield-evidence.mjs <dataset.json> <yield-evidence.json> <out.json>')
  const [, , datasetPath, evidencePath, outPath] = process.argv
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  const enriched = applyYieldEvidence(dataset, evidence)
  fs.writeFileSync(outPath, JSON.stringify(enriched, null, 2) + '\n')
  console.log(JSON.stringify({ ok: true, yieldEvidenceCount: enriched.metadata.yieldEvidenceCount }))
}
