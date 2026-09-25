import fs from 'node:fs'
import path from 'node:path'

function fail(message) { console.error(`icon install blocked: ${message}`); process.exit(1) }

const args = process.argv.slice(2)
if (args.length < 2 || args.length > 3 || args.some((value) => !value || value.startsWith('--'))) {
  fail('usage: node scripts/install-icon-assets.mjs <dataset.json> <extractor-data-dir> [out-dir]')
}
const [datasetFile, extractorDataDir, outDir = 'public/icons'] = args
if (!fs.existsSync(datasetFile)) fail(`dataset not found: ${datasetFile}`)
if (!fs.existsSync(extractorDataDir)) fail(`extractor data directory not found: ${extractorDataDir}`)

const dataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'))
const items = Object.values(dataset.items || {})
if (!items.length) fail('dataset contains no items')
const invalidPaths = items.filter((item) => !Number.isInteger(item.id) || item.id <= 0 || item.iconPath !== `icons/${item.id}.webp`)
if (invalidPaths.length) fail(`${invalidPaths.length} items do not declare the canonical local icon path icons/<itemId>.webp; first ids: ${invalidPaths.slice(0, 20).map((item) => item.id ?? '?').join(', ')}`)

const requestedRoot = path.resolve(extractorDataDir)
const directRedirectFile = path.join(requestedRoot, 'asset_redirects.json')
const parentRedirectFile = path.basename(requestedRoot).toLowerCase() === 'icons'
  ? path.join(path.dirname(requestedRoot), 'asset_redirects.json')
  : directRedirectFile
const redirectFile = fs.existsSync(directRedirectFile) ? directRedirectFile : parentRedirectFile
const dataRoot = path.dirname(redirectFile)
if (!fs.existsSync(redirectFile)) fail(`extractor icon redirect map not found: ${directRedirectFile}`)
const redirects = JSON.parse(fs.readFileSync(redirectFile, 'utf8'))
if (!redirects || typeof redirects !== 'object' || Array.isArray(redirects)) fail('extractor icon redirect map must be a JSON object')

function sourceForItem(itemId) {
  const redirect = redirects[`urn::item:${itemId}`]
  if (typeof redirect !== 'string' || !redirect.trim()) return null
  const normalized = redirect.replaceAll('\\', '/').replace(/^\.\//, '')
  if (path.isAbsolute(normalized) || normalized.split('/').includes('..')) fail(`unsafe extractor icon redirect for item ${itemId}: ${redirect}`)
  const root = dataRoot
  const source = path.resolve(root, normalized)
  if (source !== root && !source.startsWith(root + path.sep)) fail(`extractor icon redirect escapes data root for item ${itemId}: ${redirect}`)
  if (fs.existsSync(source)) return source
  if (!fs.existsSync(path.join(root, 'icons')) && normalized.startsWith('icons/')) {
    return path.resolve(root, normalized.slice('icons/'.length))
  }
  return source
}

fs.mkdirSync(outDir, { recursive: true })
const missing = []
let copied = 0
for (const item of items) {
  const source = sourceForItem(item.id)
  const destination = path.join(outDir, `${item.id}.webp`)
  if (!source || !fs.existsSync(source)) { missing.push(item.id); continue }
  fs.copyFileSync(source, destination)
  copied += 1
}

if (missing.length) fail(`${missing.length} canonical item icons are missing from extractor redirect output; first ids: ${missing.slice(0, 20).join(', ')}`)
console.log(JSON.stringify({ ok: true, required: items.length, copied, outDir, redirectFile }))
