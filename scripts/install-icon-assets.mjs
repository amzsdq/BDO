import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

function fail(message) { console.error(`icon install blocked: ${message}`); process.exit(1) }

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex') }
function verifiedWebp(file, itemId) {
  const bytes = fs.readFileSync(file)
  if (bytes.length < 20 || bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') fail(`item ${itemId} icon is not a RIFF/WEBP file`)
  if (bytes.readUInt32LE(4) !== bytes.length - 8) fail(`item ${itemId} WebP RIFF size does not match file bytes`)
  const chunk = bytes.subarray(12, 16).toString('ascii')
  if (!['VP8 ', 'VP8L', 'VP8X'].includes(chunk)) fail(`item ${itemId} WebP first chunk is not VP8/VP8L/VP8X`)
  const chunkSize = bytes.readUInt32LE(16)
  if (20 + chunkSize + (chunkSize % 2) > bytes.length) fail(`item ${itemId} WebP chunk exceeds file bytes`)
  return { bytes, sha256: sha256(bytes) }
}

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
  if (!normalized.toLowerCase().endsWith('.webp')) fail(`extractor icon redirect is not a WebP asset for item ${itemId}: ${redirect}`)
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
const manifestEntries = []
for (const item of items) {
  const source = sourceForItem(item.id)
  const destination = path.join(outDir, `${item.id}.webp`)
  if (!source || !fs.existsSync(source)) { missing.push(item.id); continue }
  const verified = verifiedWebp(source, item.id)
  fs.writeFileSync(destination, verified.bytes)
  manifestEntries.push({ itemId: item.id, size: verified.bytes.length, sha256: verified.sha256 })
  copied += 1
}

if (missing.length) fail(`${missing.length} canonical item icons are missing from extractor redirect output; first ids: ${missing.slice(0, 20).join(', ')}`)
manifestEntries.sort((a, b) => a.itemId - b.itemId)
const setHash = sha256(Buffer.from(manifestEntries.map((entry) => `${entry.itemId}:${entry.size}:${entry.sha256}`).join('\n')))
const manifestFile = path.join(outDir, 'icon-manifest.json')
fs.writeFileSync(manifestFile, JSON.stringify({ schemaVersion: 1, algorithm: 'sha256', setHash, entries: manifestEntries }, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, required: items.length, copied, outDir, redirectFile, manifestFile, setHash }))
