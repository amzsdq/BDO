import fs from 'node:fs'
import path from 'node:path'
import { assertIconManifest } from './assert-icon-manifest.mjs'

/** Bind release acceptance to the exact canonical icon bytes beside public/data/dataset.json. */
export function assertProductionIconReleaseEvidence(datasetFile, dataset) {
  const iconRoot = path.resolve(path.dirname(datasetFile), '..', 'icons')
  const manifestFile = path.join(iconRoot, 'icon-manifest.json')
  if (!fs.existsSync(manifestFile)) throw new Error('production icon manifest is required')
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
  return assertIconManifest(dataset, manifest, iconRoot)
}
