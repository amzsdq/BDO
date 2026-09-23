import { useRef, useState } from 'react'
import { exportPlannerState, importPlannerState, resetPlannerState } from './data/storage'
import { MasterySourceNotice } from './MasterySourceNotice'
import './PlannerStateActions.css'

export interface PlannerStateActionsProps {
  onReset: () => void
  exportDisabled?: boolean
}

/** Explicit local-state portability controls required by the core UX acceptance. */
export function PlannerStateActions({ onReset, exportDisabled = false }: PlannerStateActionsProps) {
  const [stateError, setStateError] = useState<string>()
  const importInput = useRef<HTMLInputElement>(null)

  function downloadExport() {
    setStateError(undefined)
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
      setStateError(error instanceof Error ? error.message : '계획을 안전하게 내보낼 수 없습니다.')
    }
  }

  async function importExport(file?: File) {
    if (!file) return
    setStateError(undefined)
    try {
      importPlannerState(JSON.parse(await file.text()))
      onReset()
    } catch (error) {
      setStateError(error instanceof Error ? error.message : '계획 파일을 안전하게 가져올 수 없습니다.')
    } finally {
      if (importInput.current) importInput.current.value = ''
    }
  }

  function reset() {
    if (!window.confirm('체크리스트, 보유 수량, 캐릭터 설정과 계획을 모두 초기화할까요?')) return
    resetPlannerState()
    setStateError(undefined)
    onReset()
  }

  return <>
    <MasterySourceNotice />
    <div className="state-actions" aria-label="저장 데이터 관리">
      <button type="button" onClick={downloadExport} disabled={exportDisabled}>계획 내보내기</button>
      <button type="button" onClick={() => importInput.current?.click()}>계획 가져오기</button>
      <input ref={importInput} className="state-import-input" type="file" accept="application/json,.json" aria-label="계획 파일 가져오기" onChange={(event) => void importExport(event.target.files?.[0])} />
      <button type="button" onClick={reset}>저장 데이터 초기화</button>
      {stateError && <p className="data-notice" role="alert">{stateError}</p>}
    </div>
  </>
}
