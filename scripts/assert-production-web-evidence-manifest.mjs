#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const REQUIRED_PRODUCTION_WEB_EVIDENCE_FILES = [
  'codex-catalog.json',
  'codex-details.json',
  'codex-items.json',
  'codex-substitutions.json',
]

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex')

export function assertProductionWebEvidenceManifest(manifest, rootDir) {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.source !== 'BDO Codex KR' || !Array.isArray(manifest.files)) throw new Error('invalid production web evidence manifest')
  const byName = new Map()
  for (const entry of manifest.files) {
    const file = String(entry?.file || '')
    if (!REQUIRED_PRODUCTION_WEB_EVIDENCE_FILES.includes(file) || byName.has(file)) throw new Error(`unexpected/duplicate production web evidence file: ${file || '<missing>'}`)
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || !/^[0-9a-f]{64}$/.test(String(entry.sha256 || ''))) throw new Error(`${file}: invalid byte/hash binding`)
    byName.set(file, entry)
  }
  for (const file of REQUIRED_PRODUCTION_WEB_EVIDENCE_FILES) {
    const entry = byName.get(file)
    if (!entry) throw new Error(`production web evidence manifest missing ${file}`)
    const fullPath = path.join(rootDir, file)
    if (!fs.existsSync(fullPath)) throw new Error(`production web evidence file missing: ${file}`)
    const bytes = fs.readFileSync(fullPath)
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`production web evidence hash mismatch: ${file}`)
  }
  return true
}

if (process.argv[1]?.endsWith('assert-production-web-evidence-manifest.mjs')) {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args.some((value) => !value || value.startsWith('--'))) throw new Error('usage: node scripts/assert-production-web-evidence-manifest.mjs <manifest.json> <evidence-dir>')
  const [manifestPath, rootDir] = args
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  assertProductionWebEvidenceManifest(manifest, rootDir)
  console.log(JSON.stringify({ ok: true, files: REQUIRED_PRODUCTION_WEB_EVIDENCE_FILES.length }))
}
