#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

function fail(message) { throw new Error(message) }
function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }
function sha256Tree(root) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) fail('icons directory is missing')
  const files = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) files.push(full)
      else fail(`unsupported icon snapshot entry: ${full}`)
    }
  }
  walk(root)
  const rel = file => path.relative(root, file).split(path.sep).join('/')
  files.sort((a, b) => rel(a).localeCompare(rel(b)))
  const h = crypto.createHash('sha256')
  for (const file of files) { h.update(rel(file)); h.update('\0'); h.update(fs.readFileSync(file)); h.update('\0') }
  return h.digest('hex')
}

const [snapshotArg] = process.argv.slice(2)
if (!snapshotArg || process.argv.length !== 3) fail('usage: node scripts/seal-snapshot-icon-provenance.mjs <snapshot-dir>')
const snapshotDir = path.resolve(snapshotArg)
const provenancePath = path.join(snapshotDir, 'provenance.json')
if (!fs.existsSync(provenancePath)) fail('provenance.json is missing')
const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8').replace(/^\uFEFF/, ''))
if (provenance.schemaVersion !== 1) fail('unsupported provenance schemaVersion')
if (!/^sha256:[0-9a-f]{64}$/.test(provenance.clientFingerprint || '')) fail('clientFingerprint must be a sha256 fingerprint')
if (String(provenance.supportedRegion || '').toUpperCase() !== 'KR') fail('snapshot must be verified as KR')
const redirects = path.join(snapshotDir, 'asset_redirects.json')
if (!fs.existsSync(redirects)) fail('asset_redirects.json is missing')
const redirectSha = sha256File(redirects)
if (provenance.artifactSha256?.['asset_redirects.json'] !== redirectSha) fail('asset_redirects.json does not match recorded provenance hash')
const iconsSnapshotSha256 = sha256Tree(path.join(snapshotDir, 'icons'))
provenance.iconsSnapshotCopied = true
provenance.iconsSnapshotSha256 = iconsSnapshotSha256
fs.writeFileSync(provenancePath, JSON.stringify(provenance, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, snapshotDir, iconsSnapshotSha256 }))
