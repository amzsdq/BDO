#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const REVIEWED_VIEWER_VERSION = '0.1.12'
const REVIEWED_EXTRACTOR_REVISION = '5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2'
function fail(message) { throw new Error(message) }
function sha256Bytes(parts) { const h = crypto.createHash('sha256'); for (const part of parts) h.update(part); return h.digest('hex') }
function sha256File(file) { return sha256Bytes([fs.readFileSync(file)]) }
function parseServiceType(text) { return text.replace(/^\uFEFF/, '').match(/^\s*TYPE\s*=\s*([^\r\n;#]+)/im)?.[1]?.trim().toUpperCase() || '' }

const [viewerArg, gameArg, outArg] = process.argv.slice(2)
if (!viewerArg || !gameArg || !outArg || process.argv.length !== 5) fail('usage: node scripts/adopt-viewer-client-snapshot.mjs <viewer-data-dir> <game-dir> <snapshot-out-dir>')
const viewerDir = path.resolve(viewerArg), gameDir = path.resolve(gameArg), outDir = path.resolve(outArg)
const manifestPath = path.join(viewerDir, 'manifest.json')
if (!fs.existsSync(manifestPath)) fail('viewer extraction manifest is missing')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''))
if (manifest.appVersion !== REVIEWED_VIEWER_VERSION) fail(`viewer appVersion must be ${REVIEWED_VIEWER_VERSION}`)
if (String(manifest.region || '').toLowerCase() !== 'kr') fail('viewer extraction region must be kr')
const serviceIni = path.join(gameDir, 'service.ini')
if (!fs.existsSync(serviceIni)) fail('installed client service.ini is missing')
if (parseServiceType(fs.readFileSync(serviceIni, 'utf8')) !== 'KR') fail('installed client service.ini must verify TYPE=KR')
const meta = path.join(gameDir, 'Paz', 'pad00000.meta'), ads = path.join(gameDir, 'ads_version')
if (!fs.existsSync(meta)) fail('installed client pad00000.meta is missing')
const fingerprintParts = [fs.readFileSync(meta)]
if (fs.existsSync(ads)) fingerprintParts.push(fs.readFileSync(ads))
const clientHash = sha256Bytes(fingerprintParts)
if (manifest.gameFingerprint !== clientHash.slice(0, 16)) fail('viewer manifest gameFingerprint does not match installed client bytes')
for (const name of ['items.json', 'recipes.json', 'mastery.json']) if (!fs.existsSync(path.join(viewerDir, name))) fail(`viewer extraction artifact missing: ${name}`)
const viewerIcons = path.join(viewerDir, 'icons')
if (!fs.existsSync(viewerIcons) || !fs.statSync(viewerIcons).isDirectory()) fail('viewer extraction icons directory is missing')
fs.mkdirSync(outDir, { recursive: true })
for (const name of ['items.json', 'recipes.json', 'mastery.json']) fs.copyFileSync(path.join(viewerDir, name), path.join(outDir, name))
fs.cpSync(viewerIcons, path.join(outDir, 'icons'), { recursive: true })
fs.copyFileSync(serviceIni, path.join(outDir, 'service.ini'))
const artifactSha256 = Object.fromEntries(['items.json','recipes.json','mastery.json','service.ini'].map(name => [name, sha256File(path.join(outDir, name))]))
const provenance = {
  schemaVersion: 1,
  source: 'installed Black Desert client via reviewed bdo-viewer',
  supportedRegion: 'KR',
  extractor: 'iDevelopThings/bdo-data-extractor',
  extractorRevision: REVIEWED_EXTRACTOR_REVISION,
  viewer: 'iDevelopThings/bdo-viewer',
  viewerVersion: REVIEWED_VIEWER_VERSION,
  extractedAt: manifest.extractedAt,
  clientFingerprint: `sha256:${clientHash}`,
  extractorGameFingerprint: clientHash.slice(0, 16),
  fingerprintInputs: ['Paz/pad00000.meta', 'ads_version-if-present'],
  gameDirectoryRecorded: false,
  iconsSnapshotCopied: true,
  regionEvidence: { file: 'service.ini', type: 'KR', sha256: artifactSha256['service.ini'] },
  artifactSha256,
}
fs.writeFileSync(path.join(outDir, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, outDir, clientFingerprint: provenance.clientFingerprint, extractorGameFingerprint: provenance.extractorGameFingerprint }))
