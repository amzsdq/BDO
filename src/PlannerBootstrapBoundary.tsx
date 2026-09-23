import type { ReactNode } from 'react'
import type { PlannerBootstrap } from './data/plannerBootstrap'
import { PlannerRecoveryNotice } from './PlannerRecoveryNotice'
import { usePlannerBootstrap } from './usePlannerBootstrap'

type ReadyBootstrap = Omit<PlannerBootstrap, 'hydration'> & {
  hydration: Extract<PlannerBootstrap['hydration'], { status: 'ready' }>
}

export interface PlannerBootstrapBoundaryProps {
  children: (bootstrap: ReadyBootstrap) => ReactNode
}

/** Dataset-first gate: no planner UI or persistence effects mount before hydration is classified. */
export function PlannerBootstrapBoundary({ children }: PlannerBootstrapBoundaryProps) {
  const state = usePlannerBootstrap()

  if (state.status === 'loading') {
    return <main className="app-shell"><p className="data-notice" role="status">플래너 데이터를 안전하게 불러오는 중…</p></main>
  }
  if (state.status === 'load-error') {
    return <main className="app-shell"><p className="data-notice" role="alert">{state.error}</p></main>
  }
  if (state.status === 'recovery-required') {
    return <main className="app-shell"><PlannerRecoveryNotice hydration={state.value.hydration} onReset={() => window.location.reload()} /></main>
  }

  return <>{children(state.value)}</>
}
