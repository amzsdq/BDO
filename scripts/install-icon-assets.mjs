import fs from 'node:fs'
import path from 'node:path'

function fail(message) { console.error(`icon install blocked: ${message}`); process.exit(1) }

const args = process.argv.slice(2)
if (args.length < 2 || args.length > 3 || args.some((value) => !value || value.startsWith('--'))) {
  fail('usage: node scripts/install-icon-assets.mjs <dataset.json> <extractor-icons-dir> [out-dir]')
}
const [datasetFile, extractorIconsDir, outDir = 'public/icons'] = args
if (!fs.existsSync(datasetFile)) fail(`dataset not found: ${datasetFile}`)
if (!fs.existsSync(extractorIconsDir)) fail(`extractor icons directory not found: ${extractorIconsDir}`)

const dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
const items = Object.values(dataset.items || {})
if (!items.length) fail('dataset contains no items')
const invalidPaths = items.filter((item) => !Number.isInteger(item.id) || item.id <= 0 || item.iconPath !== `icons/${item.id}.webp`)
if (invalidPaths.length) fail(`${invalidPaths.length} items do not declare the canonical local icon path icons/<itemId>.webp; first ids: ${invalidPaths.slice(0, 20).map((item) => item.id ?? '?').join(', ')}`)

fs.mkdirSync(outDir, { recursive: true })
const missing = []
let copied = 0
for (const item of items) {
  const filename = `${item.id}.webp`
  const source = path.join(extractorIconsDir, filename)
  const destination = path.join(outDir, filename)
  if (!fs.existsSync(source)) { missing.push(item.id); continue }
  fs.copyFileSync(source, destination)
  copied += 1
}

if (missing.length) fail(`${missing.length} canonical item icons are missing from extractor output; first ids: ${missing.slice(0, 20).join(', ')}`)
console.log(JSON.stringify({ ok: true, required: items.length, copied, outDir }))
