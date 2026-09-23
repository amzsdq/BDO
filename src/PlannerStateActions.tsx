import { useState } from 'react'
import { exportPlannerState, resetPlannerState } from './data/storage'
import { MasterySourceNotice } from './MasterySourceNotice'
import './PlannerStateActions.css'

export interface PlannerStateActionsProps {
  onReset: () => void
  exportDisabled?: boolean
}

/** Explicit local-state portability controls required by the core UX acceptance. */
export function PlannerStateActions({ onReset, exportDisabled = false }: PlannerStateActionsProps) {
  const [exportError, setExportError] = useState<string>()

  function downloadExport() {
    setExportError(undefined)
    try {
      const payload = JSON.stringify(exportPlannerState(), null, 2)
      const blob = new Blob([payload], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `bdo-planner-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '계획을 안전하게 내보낼 수 없습니다.')
    }
  }

  function reset() {
    if (!window.confirm('체크리스트, 보유 수량, 캐릭터 설정과 계획을 모두 초기화할까요?')) return
    resetPlannerState()
    setExportError(undefined)
    onReset()
  }

  return <>
    <MasterySourceNotice />
    <div className="state-actions" aria-label="저장 데이터 관리">
      <button type="button" onClick={downloadExport} disabled={exportDisabled}>계획 내보내기</button>
      <button type="button" onClick={reset}>저장 데이터 초기화</button>
      {exportError && <p className="data-notice" role="alert">{exportError}</p>}
    </div>
  </>
}
