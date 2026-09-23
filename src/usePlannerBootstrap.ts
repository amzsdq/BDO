import { useEffect, useState } from 'react'
import { bootstrapPlanner, type PlannerBootstrap } from './data/plannerBootstrap'

type ReadyHydration = Extract<PlannerBootstrap['hydration'], { status: 'ready' }>
type RecoveryHydration = Extract<PlannerBootstrap['hydration'], { status: 'recovery-required' }>
type ReadyBootstrap = Omit<PlannerBootstrap, 'hydration'> & { hydration: ReadyHydration }
type RecoveryBootstrap = Omit<PlannerBootstrap, 'hydration'> & { hydration: RecoveryHydration }

export type PlannerBootstrapState =
  | { status: 'loading' }
  | { status: 'ready'; value: ReadyBootstrap }
  | { status: 'recovery-required'; value: RecoveryBootstrap }
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
          setState({ status: 'ready', value: { ...value, hydration: value.hydration } })
        } else {
          setState({ status: 'recovery-required', value: { ...value, hydration: value.hydration } })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'load-error', error: error instanceof Error ? error.message : '플래너 데이터를 불러오지 못했습니다.' })
      })
    return () => { cancelled = true }
  }, [])

  return state
}
