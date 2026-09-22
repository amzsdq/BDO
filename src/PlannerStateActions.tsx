import { exportPlannerState, resetPlannerState } from './data/storage'

export interface PlannerStateActionsProps {
  onReset: () => void
}

/** Explicit local-state portability controls required by the core UX acceptance. */
export function PlannerStateActions({ onReset }: PlannerStateActionsProps) {
  function downloadExport() {
    const payload = JSON.stringify(exportPlannerState(), null, 2)
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `bdo-planner-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function reset() {
    if (!window.confirm('체크리스트, 보유 수량, 캐릭터 설정과 계획을 모두 초기화할까요?')) return
    resetPlannerState()
    onReset()
  }

  return <div className="state-actions" aria-label="저장 데이터 관리">
    <button type="button" onClick={downloadExport}>계획 내보내기</button>
    <button type="button" onClick={reset}>저장 데이터 초기화</button>
  </div>
}
