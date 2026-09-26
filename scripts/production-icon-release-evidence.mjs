import fs from 'node:fs'
import path from 'node:path'
import { assertIconManifest } from './assert-icon-manifest.mjs'

/** Bind release acceptance to the exact canonical icon bytes beside public/data/dataset.json. */
export function assertProductionIconReleaseEvidence(datasetFile, dataset) {
  const iconRoot = path.resolve(path.dirname(datasetFile), '..', 'icons')
  const manifestFile = path.join(iconRoot, 'icon-manifest.json')
  if (!fs.existsSync(manifestFile)) throw new Error('production icon manifest is required')
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
  const source = manifest.sourceProvenance
  const clientFingerprint = String(dataset.metadata?.clientFingerprint || '').toLowerCase()
  if (!source || String(source.clientFingerprint || '').toLowerCase() !== clientFingerprint) throw new Error('production icon manifest is not bound to dataset client fingerprint')
  for (const key of ['assetRedirectsSha256', 'iconsSnapshotSha256']) if (!/^[0-9a-f]{64}$/.test(String(source[key] || '').toLowerCase())) throw new Error(`production icon manifest source provenance ${key} is invalid`)
  return { ...assertIconManifest(dataset, manifest, iconRoot), sourceProvenance: source }
}
