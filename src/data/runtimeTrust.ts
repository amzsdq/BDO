import type { RecipeDataset } from '../domain/types'

interface ReleaseMetadata {
  status?: string
  reconciliationStatus?: string
  verifiedAt?: string
  fingerprint?: string
  sourceRevision?: string
  counts?: { cooking?: number; alchemy?: number }
}

async function payloadFingerprint(dataset: RecipeDataset): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) return undefined
  const clone = JSON.parse(JSON.stringify(dataset)) as RecipeDataset
  delete (clone.metadata as RecipeDataset['metadata'] & ReleaseMetadata).fingerprint
  const bytes = new TextEncoder().encode(JSON.stringify(clone))
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Runtime display gate for the green verified state, including payload-integrity verification. */
export async function hasRuntimeVerifiedEvidence(dataset: RecipeDataset): Promise<boolean> {
  const metadata = dataset.metadata as RecipeDataset['metadata'] & ReleaseMetadata
  if (metadata.supportedRegion !== 'KR') return false
  if (metadata.status !== 'COMPLETE_VERIFIED' || metadata.reconciliationStatus !== 'ZERO_UNEXPLAINED_DIFF') return false
  if (!metadata.verifiedAt || !metadata.fingerprint) return false
  if (!Array.isArray(metadata.sources) || metadata.sources.length < 2) return false
  const sourceRevision = String(metadata.sourceRevision ?? '').trim()
  if (!sourceRevision || sourceRevision.toLowerCase() === 'unrecorded') return false

  const recipes = Object.values(dataset.recipes)
  const cooking = recipes.filter((recipe) => recipe.skill === 'cooking').length
  const alchemy = recipes.filter((recipe) => recipe.skill === 'alchemy').length
  if (!cooking || !alchemy || metadata.counts?.cooking !== cooking || metadata.counts?.alchemy !== alchemy) return false

  for (const item of Object.values(dataset.items)) {
    if (!String(item.nameKo || '').trim() || /^아이템 #\d+$/.test(String(item.nameKo))) return false
    if (!item.iconPath && !item.iconUrl) return false
    if (item.iconPath && item.iconPath !== `icons/${item.id}.webp`) return false
  }

  const actualFingerprint = await payloadFingerprint(dataset)
  return actualFingerprint === metadata.fingerprint
}
