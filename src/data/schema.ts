import type { RecipeDataset } from '../domain/types'

export type DatasetStatus =
  | 'SAMPLE_ONLY'
  | 'CLIENT_IMPORTED_UNRECONCILED'
  | 'INCOMPLETE_REVIEW'
  | 'COMPLETE_VERIFIED'

export interface DatasetMetadata {
  generatedAt: string
  supportedRegion: 'KR'
  status: DatasetStatus
  sources: string[]
  counts?: {
    cooking: number
    alchemy: number
  }
  fingerprint?: string
}

export interface ProductionRecipeDataset extends RecipeDataset {
  metadata: RecipeDataset['metadata'] & DatasetMetadata
}

export function assertReleaseDataset(dataset: ProductionRecipeDataset) {
  if (dataset.metadata.status !== 'COMPLETE_VERIFIED') {
    throw new Error(
      `release blocked: dataset status is ${dataset.metadata.status}`,
    )
  }
  if (!dataset.metadata.counts) {
    throw new Error('release blocked: recipe counts missing')
  }
  if (dataset.metadata.counts.cooking <= 0 || dataset.metadata.counts.alchemy <= 0) {
    throw new Error('release blocked: cooking/alchemy recipe set is empty')
  }
}
