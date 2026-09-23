import type { RecipeDataset } from '../domain/types'
import { createInitialPlanSession } from './initialPlanSession'
import { hydratePlannerBundle, type PlannerBundleHydration } from './plannerBundleHydration'
import { loadRuntimeDataset, type DatasetMode } from './runtime'

export type PlannerBootstrap = {
  dataset: RecipeDataset
  datasetMode: DatasetMode
  datasetMessage: string
  hydration: PlannerBundleHydration
}

/**
 * The only supported startup order for persisted planner state:
 * runtime dataset first, then validation/hydration against that exact dataset.
 * No caller needs to mount sample state or read/write persistence beforehand.
 */
export async function bootstrapPlanner(
  storage: Pick<Storage, 'getItem'> = localStorage,
): Promise<PlannerBootstrap> {
  const loaded = await loadRuntimeDataset()
  const hydration = hydratePlannerBundle(loaded.dataset, storage)

  if (hydration.status === 'ready' && hydration.source === 'first-run') {
    return {
      dataset: loaded.dataset,
      datasetMode: loaded.mode,
      datasetMessage: loaded.message,
      hydration: { ...hydration, session: createInitialPlanSession(loaded.dataset) },
    }
  }

  return {
    dataset: loaded.dataset,
    datasetMode: loaded.mode,
    datasetMessage: loaded.message,
    hydration,
  }
}
