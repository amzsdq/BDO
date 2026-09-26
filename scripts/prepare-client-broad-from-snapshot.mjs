#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { assertReviewedExtractorRevision } from './production-source-contract.mjs'

function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }
const snapshotDir = process.argv[2]
const outArg = process.argv[3]
if (!snapshotDir || process.argv.length > 4) throw new Error('usage: node scripts/prepare-client-broad-from-snapshot.mjs <snapshot-dir> [out.json]')
const root = path.resolve(snapshotDir)
const provenancePath = path.join(root, 'provenance.json')
if (!fs.existsSync(provenancePath)) throw new Error(`snapshot provenance missing: ${provenancePath}`)
const provenanceText = fs.readFileSync(provenancePath, 'utf8')
const provenance = JSON.parse(provenanceText.charCodeAt(0) === 0xfeff ? provenanceText.slice(1) : provenanceText)
if (provenance?.schemaVersion !== 1 || provenance?.supportedRegion !== 'KR') throw new Error('KR same-snapshot provenance is required')
const revision = String(provenance.extractorRevision || '').trim()
const clientFingerprint = String(provenance.clientFingerprint || '').trim()
if (!/^[0-9a-f]{40}$/i.test(revision)) throw new Error('snapshot extractorRevision must be an exact 40-character commit SHA')
assertReviewedExtractorRevision(`iDevelopThings/bdo-data-extractor@${revision}`)
if (!/^sha256:[0-9a-f]{64}$/i.test(clientFingerprint)) throw new Error('snapshot clientFingerprint is invalid')
const regionEvidence = provenance?.regionEvidence
if (regionEvidence?.file !== 'service.ini' || regionEvidence?.type !== 'KR' || !/^[0-9a-f]{64}$/i.test(String(regionEvidence?.sha256 || ''))) {
  throw new Error('KR service.ini regionEvidence is required')
}
const serviceIni = path.join(root, 'service.ini')
if (!fs.existsSync(serviceIni)) throw new Error(`snapshot region evidence missing: ${serviceIni}`)
const serviceIniSha = sha256(serviceIni)
const recordedServiceIniSha = String(provenance?.artifactSha256?.['service.ini'] || '').toLowerCase()
if (!recordedServiceIniSha || recordedServiceIniSha !== serviceIniSha || String(regionEvidence.sha256).toLowerCase() !== serviceIniSha) {
  throw new Error('service.ini SHA-256 does not match same-snapshot provenance')
}
const serviceIniText = fs.readFileSync(serviceIni, 'utf8').replace(/^\uFEFF/, '')
const serviceType = serviceIniText.match(/^\s*TYPE\s*=\s*([^\r\n;#]+)/im)?.[1]?.trim().toUpperCase()
if (serviceType !== 'KR') throw new Error('snapshot service.ini must verify TYPE=KR')
const items = path.join(root, 'items.json'), recipes = path.join(root, 'recipes.json')
for (const file of [items, recipes]) {
  if (!fs.existsSync(file)) throw new Error(`snapshot artifact missing: ${file}`)
  const name = path.basename(file)
  const recorded = String(provenance?.artifactSha256?.[name] || '').toLowerCase()
  const actual = sha256(file)
  if (!recorded || recorded !== actual) throw new Error(`${name} SHA-256 does not match same-snapshot provenance`)
}
const out = path.resolve(outArg || path.join(root, 'client-broad.json'))
const result = spawnSync(process.execPath, [
  'scripts/import-bdo-extractor.mjs',
  '--items', items,
  '--recipes', recipes,
  '--out', out,
  '--source-revision', revision,
  '--client-fingerprint', clientFingerprint,
], { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
if (result.status !== 0) throw new Error(`broad client import failed (exit ${result.status}):\n${(result.stderr || result.stdout || '').trim()}`)
if (result.stdout) process.stdout.write(result.stdout)
console.log(JSON.stringify({ ok: true, snapshot: root, out, sourceRevision: revision, clientFingerprint }))
