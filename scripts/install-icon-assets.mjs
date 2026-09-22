import fs from 'node:fs'
import path from 'node:path'

function fail(message) { console.error(`icon install blocked: ${message}`); process.exit(1) }

const [datasetFile, extractorIconsDir, outDir = 'public/icons'] = process.argv.slice(2)
if (!datasetFile || !extractorIconsDir) fail('usage: node scripts/install-icon-assets.mjs <dataset.json> <extractor-icons-dir> [out-dir]')
if (!fs.existsSync(datasetFile)) fail(`dataset not found: ${datasetFile}`)
if (!fs.existsSync(extractorIconsDir)) fail(`extractor icons directory not found: ${extractorIconsDir}`)

const dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
const items = Object.values(dataset.items || {})
const required = items.filter((item) => typeof item.iconPath === 'string' && /^icons\/\d+\.webp$/.test(item.iconPath))
if (!required.length) fail('dataset contains no canonical local icon paths')

fs.mkdirSync(outDir, { recursive: true })
const missing = []
let copied = 0
for (const item of required) {
  const filename = `${item.id}.webp`
  const source = path.join(extractorIconsDir, filename)
  const destination = path.join(outDir, filename)
  if (!fs.existsSync(source)) { missing.push(item.id); continue }
  fs.copyFileSync(source, destination)
  copied += 1
}

if (missing.length) fail(`${missing.length} canonical item icons are missing from extractor output; first ids: ${missing.slice(0, 20).join(', ')}`)
console.log(JSON.stringify({ ok: true, required: required.length, copied, outDir }))
