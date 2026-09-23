import { useEffect, useState } from 'react'
import { bootstrapPlanner, type PlannerBootstrap } from './data/plannerBootstrap'

export type PlannerBootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; value: PlannerBootstrap & { hydration: Extract<PlannerBootstrap['hydration'], { status: 'ready' }> } }
  | { status: 'recovery-required'; value: PlannerBootstrap & { hydration: Extract<PlannerBootstrap['hydration'], { status: 'recovery-required' }> } }
  | { status: 'load-error'; error: string }

/**
 * App startup boundary. Persistence reads happen only after runtime data has
 * loaded, and callers cannot accidentally treat recovery-required as ready.
 */
export function usePlannerBootstrap(): PlannerBootstrapState {
  const [state, setState] = useState<PlannerBootstrapState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    void bootstrapPlanner()
      .then((value) => {
        if (cancelled) return
        if (value.hydration.status === 'ready') {
          setState({ status: 'ready', value: value as PlannerBootstrapState & never extends never ? never : typeof value & { hydration: Extract<typeof value.hydration, { status: 'ready' }> } })
        } else {
          setState({ status: 'recovery-required', value: value as typeof value & { hydration: Extract<typeof value.hydration, { status: 'recovery-required' }> } })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'load-error', error: error instanceof Error ? error.message : '플래너 데이터를 불러오지 못했습니다.' })
      })
    return () => { cancelled = true }
  }, [])

  return state
}
