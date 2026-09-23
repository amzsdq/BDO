import type { RecipeDataset } from '../domain/types'
import { sampleDataset } from './sample'
import { hasRuntimeVerifiedEvidence } from './runtimeTrust'

export type DatasetMode = 'verified' | 'imported-unreconciled' | 'sample-fallback'

export interface RuntimeDataset {
  dataset: RecipeDataset
  mode: DatasetMode
  message: string
}

function looksLikeDataset(value: unknown): value is RecipeDataset {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<RecipeDataset>
  return Boolean(candidate.items && candidate.recipes && candidate.recipesByOutput && candidate.metadata?.supportedRegion === 'KR')
}

export async function loadRuntimeDataset(): Promise<RuntimeDataset> {
  try {
    const response = await fetch('./data/dataset.json', { cache: 'no-cache' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const candidate: unknown = await response.json()
    if (!looksLikeDataset(candidate)) throw new Error('invalid dataset shape')

    const verified = await hasRuntimeVerifiedEvidence(candidate)
    return {
      dataset: candidate,
      mode: verified ? 'verified' : 'imported-unreconciled',
      message: verified
        ? 'KR 전체 레시피 검증 완료'
        : '실데이터를 불러왔지만 전체 레시피 대조 검증 전이거나 검증 증거가 불완전합니다.',
    }
  } catch (error) {
    return {
      dataset: sampleDataset,
      mode: 'sample-fallback',
      message: `검증 데이터셋을 불러오지 못해 샘플 모드로 실행 중입니다. (${error instanceof Error ? error.message : 'unknown error'})`,
    }
  }
}
