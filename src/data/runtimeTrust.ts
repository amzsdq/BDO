import type { RecipeDataset } from '../domain/types'

interface ReleaseMetadata {
  status?: string
  reconciliationStatus?: string
  verifiedAt?: string
  fingerprint?: string
  counts?: { cooking?: number; alchemy?: number }
}

/**
 * Runtime display gate for the green "verified" state. This is intentionally
 * stricter than trusting metadata.status alone. The build-time release gate is
 * still authoritative; this prevents a stale/partially copied artifact from
 * presenting itself as complete merely because it retained one status string.
 */
export function hasRuntimeVerifiedEvidence(dataset: RecipeDataset): boolean {
  const metadata = dataset.metadata as RecipeDataset['metadata'] & ReleaseMetadata
  if (metadata.supportedRegion !== 'KR') return false
  if (metadata.status !== 'COMPLETE_VERIFIED' || metadata.reconciliationStatus !== 'ZERO_UNEXPLAINED_DIFF') return false
  if (!metadata.verifiedAt || !metadata.fingerprint) return false
  if (!Array.isArray(metadata.sources) || metadata.sources.length < 2) return false

  const recipes = Object.values(dataset.recipes)
  const cooking = recipes.filter((recipe) => recipe.skill === 'cooking').length
  const alchemy = recipes.filter((recipe) => recipe.skill === 'alchemy').length
  if (!cooking || !alchemy || metadata.counts?.cooking !== cooking || metadata.counts?.alchemy !== alchemy) return false

  for (const item of Object.values(dataset.items)) {
    if (!String(item.nameKo || '').trim() || /^아이템 #\d+$/.test(String(item.nameKo))) return false
    if (!item.iconPath && !item.iconUrl) return false
  }
  return true
}
