import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { resolve } from 'node:path'
import { pruneItemsToPlannerScope } from './planner-item-scope.mjs'

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
const outPath = outIndex >= 0 ? args[outIndex + 1] : undefined
if (!outPath) throw new Error('required: --out <dataset.json>')

// Keep the structural importer single-purpose, then reduce its broad extractor
// item catalog to the exact runtime/planner graph before any enrichment/gating.
execFileSync(process.execPath, [resolve('scripts/import-bdo-extractor.mjs'), ...args], { stdio: 'inherit' })
const dataset = JSON.parse(fs.readFileSync(outPath, 'utf8'))
const before = Object.keys(dataset.items || {}).length
dataset.items = pruneItemsToPlannerScope(dataset.items || {}, dataset.recipes || {}, dataset.byproducts || {})
const after = Object.keys(dataset.items).length

// The importer fingerprint covered the broad intermediate payload. Scoping changes
// the canonical payload, so invalidate it; promotion computes the final fingerprint.
if (dataset.metadata) {
  delete dataset.metadata.fingerprint
  dataset.metadata.itemScope = 'planner-referenced-cooking-alchemy-v1'
  dataset.metadata.importedItemCount = before
  dataset.metadata.scopedItemCount = after
}
fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, itemScope: dataset.metadata?.itemScope, importedItems: before, scopedItems: after }))
