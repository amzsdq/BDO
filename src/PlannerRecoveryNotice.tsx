import type { PlannerBundleHydration } from './data/plannerBundleHydration'
import { PlannerStateActions } from './PlannerStateActions'

export interface PlannerRecoveryNoticeProps {
  hydration: Extract<PlannerBundleHydration, { status: 'recovery-required' }>
  onReset: () => void
}

/**
 * Recovery is explicit: corrupted/newer persisted state is never silently
 * replaced by defaults. Export stays disabled because strict export would be
 * misleading for a bundle that failed validation; reset remains deliberate.
 */
export function PlannerRecoveryNotice({ hydration, onReset }: PlannerRecoveryNoticeProps) {
  return <section className="panel recovery-panel" role="alert" aria-labelledby="planner-recovery-title">
    <div className="section-heading">
      <span>!</span>
      <div>
        <strong id="planner-recovery-title">저장된 계획을 안전하게 복구해야 합니다.</strong>
        <small>자동 저장을 중지했습니다. 기존 데이터를 임의로 덮어쓰지 않습니다.</small>
      </div>
    </div>
    <ul>
      {hydration.errors.length
        ? hydration.errors.map((error) => <li key={error}>{error}</li>)
        : <li>검증하지 못한 저장 영역: {hydration.components.join(', ')}</li>}
    </ul>
    <PlannerStateActions onReset={onReset} exportDisabled />
  </section>
}
