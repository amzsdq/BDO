#!/usr/bin/env node
import fs from 'node:fs'\nimport crypto from 'node:crypto'
import { applySubstitutionEvidence } from './apply-substitution-evidence.mjs'
import { pruneItemsToPlannerScope } from './planner-item-scope.mjs'

export function finalizePlannerScope(dataset, substitutionEvidence, substitutionEvidenceSha256) {
  let result = structuredClone(dataset)
  const before = Object.keys(result.items || {}).length
  if (substitutionEvidence) result = applySubstitutionEvidence(result, substitutionEvidence)
  result.items = pruneItemsToPlannerScope(result.items || {}, result.recipes || {}, result.byproducts || {}, result.substitutionGroups || {})
  result.metadata ||= {}
  delete result.metadata.fingerprint
  result.metadata.itemScope = 'planner-referenced-cooking-alchemy-v2'
  result.metadata.importedItemCount = before
  result.metadata.scopedItemCount = Object.keys(result.items).length
  result.metadata.substitutionEvidenceApplied = Boolean(substitutionEvidence)\n  if (substitutionEvidenceSha256) result.metadata.substitutionEvidenceSha256 = substitutionEvidenceSha256
  return result
}
if (process.argv[1]?.endsWith('finalize-planner-scope.mjs')) {
  const [datasetPath, outPath, substitutionPath] = process.argv.slice(2)
  if (!datasetPath || !outPath) throw new Error('usage: node scripts/finalize-planner-scope.mjs <pre-enriched-dataset.json> <out.json> [substitution-evidence.json]')
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))
  const evidence = substitutionPath ? JSON.parse(fs.readFileSync(substitutionPath, 'utf8')) : undefined
  const result = finalizePlannerScope(dataset, evidence)
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify({ ok: true, importedItems: result.metadata.importedItemCount, scopedItems: result.metadata.scopedItemCount, substitutionEvidenceApplied: result.metadata.substitutionEvidenceApplied }))
}
