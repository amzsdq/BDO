import fs from 'node:fs'

function fail(message) {
  console.error(message)
  process.exit(1)
}

function args(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 2) out[String(argv[i] || '').replace(/^--/, '')] = argv[i + 1]
  return out
}

function normalizedName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\s·・'"]/g, '')
    .toLocaleLowerCase('ko-KR')
}

function normalizedSkill(value) {
  return String(value || '').toLowerCase()
}

function outputItemIdFromCodex(entry) {
  const value = entry.outputItemId ?? entry.itemId
  if (value === undefined || value === null || value === '') return undefined
  const id = Number(value)
  return Number.isSafeInteger(id) && id >= 0 ? id : undefined
}

function reconciliationKey(skill, outputItemId, outputName) {
  return outputItemId !== undefined
    ? `${skill}:item:${outputItemId}`
    : `${skill}:name:${normalizedName(outputName)}`
}

function signatureFromDataset(dataset, recipe, variant) {
  return variant.inputs
    .map((input) => {
      const name = dataset.items[String(input.itemId)]?.nameKo || `#${input.itemId}`
      return `${normalizedName(name)}:${Number(input.count)}`
    })
    .sort()
    .join('|')
}

function signatureFromCodex(entry) {
  return (entry.ingredients || [])
    .map((input) => {
      const itemId = input.itemId === undefined || input.itemId === null ? undefined : Number(input.itemId)
      const identity = Number.isSafeInteger(itemId) && itemId >= 0 ? `#${itemId}` : normalizedName(input.name)
      return `${identity}:${Number(input.count)}`
    })
    .sort()
    .join('|')
}

const opt = args(process.argv.slice(2))
if (!opt.dataset || !opt.codex) fail('usage: --dataset <dataset.json> --codex <codex-manifest.json> [--review <review.json>] [--out <report.json>]')

const dataset = JSON.parse(fs.readFileSync(opt.dataset, 'utf8'))
const manifest = JSON.parse(fs.readFileSync(opt.codex, 'utf8'))
const review = opt.review && fs.existsSync(opt.review)
  ? JSON.parse(fs.readFileSync(opt.review, 'utf8'))
  : { acceptedDiffs: [] }

const accepted = new Set((review.acceptedDiffs || []).map((x) => x.key))
const clientByKey = new Map()

for (const recipe of Object.values(dataset.recipes || {})) {
  const output = dataset.items[String(recipe.outputItemId)]
  const skill = normalizedSkill(recipe.skill)
  const key = reconciliationKey(skill, Number(recipe.outputItemId), output?.nameKo)
  clientByKey.set(key, {
    recipe,
    output,
    signatures: new Set((recipe.variants || []).map((variant) => signatureFromDataset(dataset, recipe, variant))),
  })
}

const codexLive = (manifest.recipes || []).filter((entry) => entry.available !== false)
const codexByKey = new Map()
for (const entry of codexLive) {
  const skill = normalizedSkill(entry.skill)
  const outputItemId = outputItemIdFromCodex(entry)
  const key = reconciliationKey(skill, outputItemId, entry.titleKo)
  const group = codexByKey.get(key) || []
  group.push(entry)
  codexByKey.set(key, group)
}

const diffs = []
for (const [key, client] of clientByKey) {
  if (!codexByKey.has(key)) {
    diffs.push({ key: `CLIENT_ONLY:${key}`, kind: 'CLIENT_ONLY', output: client.output?.nameKo, recipeId: client.recipe.id })
    continue
  }
  for (const entry of codexByKey.get(key)) {
    const sig = signatureFromCodex(entry)
    if (sig && !client.signatures.has(sig)) {
      diffs.push({
        key: `SIGNATURE:${entry.recipeId}:${key}`,
        kind: 'SIGNATURE_MISMATCH',
        codexRecipeId: entry.recipeId,
        output: entry.titleKo,
        codexSignature: sig,
        clientSignatures: [...client.signatures],
      })
    }
  }
}

for (const [key, entries] of codexByKey) {
  if (!clientByKey.has(key)) {
    for (const entry of entries) {
      diffs.push({ key: `CODEX_ONLY:${entry.recipeId}:${key}`, kind: 'CODEX_ONLY', codexRecipeId: entry.recipeId, output: entry.titleKo })
    }
  }
}

const unresolved = diffs.filter((entry) => !accepted.has(entry.key))
const report = {
  generatedAt: new Date().toISOString(),
  clientRecipeGroups: clientByKey.size,
  codexLivePages: codexLive.length,
  codexDisabledPages: (manifest.recipes || []).length - codexLive.length,
  diffs,
  unresolved,
  status: unresolved.length ? 'INCOMPLETE_REVIEW' : 'ZERO_UNEXPLAINED_DIFF',
}

if (opt.out) fs.writeFileSync(opt.out, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({
  status: report.status,
  clientRecipeGroups: report.clientRecipeGroups,
  codexLivePages: report.codexLivePages,
  diffs: diffs.length,
  unresolved: unresolved.length,
}))

if (unresolved.length) process.exitCode = 2
