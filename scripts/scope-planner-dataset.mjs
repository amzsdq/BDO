import fs from 'node:fs'
import { pruneItemsToPlannerScope } from './planner-item-scope.mjs'

const args = process.argv.slice(2)
if (args.length < 1 || args.length > 2 || args.some((value) => !value || value.startsWith('-'))) throw new Error('usage: node scripts/scope-planner-dataset.mjs <dataset.json> [out.json]')
const [inputPath, outPath = inputPath] = args

const dataset = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const before = Object.keys(dataset.items || {}).length
const plannerScoped = pruneItemsToPlannerScope(
  dataset.items || {},
  dataset.recipes || {},
  dataset.byproducts || {},
  dataset.substitutionGroups || {},
)
dataset.items = plannerScoped
const after = Object.keys(dataset.items).length
const substitutionMembers = new Set(
  Object.values(dataset.substitutionGroups || {}).flatMap((group) => group?.memberItemIds || []).map(String),
).size

if (dataset.metadata) {
  delete dataset.metadata.fingerprint
  dataset.metadata.itemScope = 'planner-referenced-cooking-alchemy-substitutions-v1'
  dataset.metadata.importedItemCount ??= before
  dataset.metadata.scopedItemCount = after
}
fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, itemScope: dataset.metadata?.itemScope, importedItems: before, scopedItems: after, substitutionMembers }))
