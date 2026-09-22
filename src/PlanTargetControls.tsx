import type { CookingPreparationPolicy } from './domain/durabilityPlan'
import type { PlanInputMode } from './data/planSession'

const POLICIES: Array<{ value: CookingPreparationPolicy; label: string }> = [
  { value: 'minimum', label: '최소 준비' },
  { value: 'expected', label: '기대값 준비' },
  { value: 'safe95', label: '95% 안전 준비' },
  { value: 'maximum', label: '최대 준비' },
]

export interface PlanTargetControlsProps {
  skill: 'cooking' | 'alchemy'
  mode: PlanInputMode
  amount: number
  cookingPreparationPolicy: CookingPreparationPolicy
  onModeChange: (mode: PlanInputMode) => void
  onAmountChange: (amount: number) => void
  onCookingPreparationPolicyChange: (policy: CookingPreparationPolicy) => void
}

export function PlanTargetControls(props: PlanTargetControlsProps) {
  const { skill, mode, amount, cookingPreparationPolicy } = props
  return (
    <>
      <div className="segmented" aria-label="계획 기준">
        <button type="button" className={mode === 'output' ? 'active' : ''} aria-pressed={mode === 'output'} onClick={() => props.onModeChange('output')}>목표 결과물</button>
        <button type="button" className={mode === 'servings' ? 'active' : ''} aria-pressed={mode === 'servings'} onClick={() => props.onModeChange('servings')}>재료 회분</button>
        <button type="button" className={mode === 'durability' ? 'active' : ''} aria-pressed={mode === 'durability'} onClick={() => props.onModeChange('durability')}>도구 사용 횟수</button>
      </div>
      <label className="field">
        {mode === 'output' ? '목표 결과물 수량' : mode === 'servings' ? '준비할 재료 회분' : '사용할 도구 내구도'}
        <input type="number" min="1" step="1" value={amount} onChange={(event) => props.onAmountChange(Math.max(1, Number(event.target.value) || 1))} />
      </label>
      {mode === 'durability' && skill === 'cooking' ? (
        <label className="field">
          대량 요리 준비 기준
          <select value={cookingPreparationPolicy} onChange={(event) => props.onCookingPreparationPolicyChange(event.target.value as CookingPreparationPolicy)}>
            {POLICIES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
          </select>
          <small>체크리스트와 무게 계산에는 선택한 기준의 실제 재료 회분을 사용합니다.</small>
        </label>
      ) : null}
    </>
  )
}
