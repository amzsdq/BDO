import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { applySubstitutionEvidence } from './apply-substitution-evidence.mjs'
import { pruneItemsToPlannerScope } from './planner-item-scope.mjs'

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
const substitutionIndex = args.indexOf('--substitution-evidence')
const outPath = outIndex >= 0 ? args[outIndex + 1] : undefined
const substitutionEvidencePath = substitutionIndex >= 0 ? args[substitutionIndex + 1] : undefined
if (!outPath) throw new Error('required: --out <dataset.json>')
if (substitutionIndex >= 0 && !substitutionEvidencePath) throw new Error('required: --substitution-evidence <evidence.json>')

// The structural importer must see the broad client item catalog first. Codex
// substitution evidence can introduce valid planner members that are not direct
// recipe inputs, so apply that evidence before final planner scoping.
const importerArgs = args.filter((_, index) => index !== substitutionIndex && index !== substitutionIndex + 1)
execFileSync(process.execPath, [resolve('scripts/import-bdo-extractor.mjs'), ...importerArgs], { stdio: 'inherit' })
let dataset = JSON.parse(fs.readFileSync(outPath, 'utf8'))
const before = Object.keys(dataset.items || {}).length
if (substitutionEvidencePath) {
  const evidence = JSON.parse(fs.readFileSync(substitutionEvidencePath, 'utf8'))
  dataset = applySubstitutionEvidence(dataset, evidence)
}
dataset.items = pruneItemsToPlannerScope(dataset.items || {}, dataset.recipes || {}, dataset.byproducts || {}, dataset.substitutionGroups || {})
const after = Object.keys(dataset.items).length

// The importer fingerprint covered the broad intermediate payload. Enrichment
// and scoping change the canonical payload, so invalidate it; promotion computes
// the final fingerprint.
if (dataset.metadata) {
  delete dataset.metadata.fingerprint
  dataset.metadata.itemScope = 'planner-referenced-cooking-alchemy-v2'
  dataset.metadata.importedItemCount = before
  dataset.metadata.scopedItemCount = after
  dataset.metadata.substitutionEvidenceApplied = Boolean(substitutionEvidencePath)
}
fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, itemScope: dataset.metadata?.itemScope, importedItems: before, scopedItems: after, substitutionEvidenceApplied: Boolean(substitutionEvidencePath) }))
