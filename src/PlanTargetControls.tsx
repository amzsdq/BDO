import type { CookingPreparationPolicy } from './domain/durabilityPlan'
import type { YieldPolicy } from './domain/types'
import type { PlanInputMode } from './data/planSession'
import { parseOptionalNonNegativeFinite } from './data/numericInput'
import './PlanTargetControls.css'

const PREPARATION_POLICIES: Array<{ value: CookingPreparationPolicy; label: string }> = [
  { value: 'minimum', label: '최소 준비' }, { value: 'expected', label: '기대값 준비' }, { value: 'safe95', label: '95% 안전 준비' }, { value: 'maximum', label: '최대 준비' },
]
const YIELD_POLICIES: Array<{ value: YieldPolicy; label: string }> = [
  { value: 'minimum', label: '최소 산출량' }, { value: 'expected', label: '기대 산출량 (검증값 없으면 최소)' }, { value: 'maximum', label: '최대 산출량' },
]

export interface PlanTargetControlsProps {
  skill: 'cooking' | 'alchemy'; mode: PlanInputMode; amount: number; cookingPreparationPolicy: CookingPreparationPolicy
  yieldPolicy?: YieldPolicy
  onModeChange: (mode: PlanInputMode) => void; onAmountChange: (amount: number) => void
  onYieldPolicyChange?: (policy: YieldPolicy) => void
  onCookingPreparationPolicyChange: (policy: CookingPreparationPolicy) => void
}

export function PlanTargetControls(props: PlanTargetControlsProps) {
  const { skill, mode, amount, cookingPreparationPolicy } = props
  const yieldPolicy = props.yieldPolicy ?? 'minimum'
  const changeAmount = (raw: string) => { const parsed = parseOptionalNonNegativeFinite(raw); const positive = parsed != null && parsed > 0 ? parsed : 1; props.onAmountChange(Math.max(1, Math.floor(positive))) }
  return <>
    <div className="segmented plan-mode-tabs" aria-label="계획 기준">
      <button type="button" className={mode === 'output' ? 'active' : ''} aria-pressed={mode === 'output'} onClick={() => props.onModeChange('output')}>목표 결과물</button>
      <button type="button" className={mode === 'servings' ? 'active' : ''} aria-pressed={mode === 'servings'} onClick={() => props.onModeChange('servings')}>재료 회분</button>
      <button type="button" className={mode === 'durability' ? 'active' : ''} aria-pressed={mode === 'durability'} onClick={() => props.onModeChange('durability')}>도구 사용</button>
    </div>
    <label className="field">{mode === 'output' ? '목표 결과물 수량' : mode === 'servings' ? '준비할 재료 회분' : '사용할 도구 내구도'}<input type="number" min="1" step="1" value={amount} onFocus={(event) => event.currentTarget.select()} onChange={(event) => changeAmount(event.target.value)} /></label>
    {mode === 'output' && props.onYieldPolicyChange ? <label className="field plan-policy-field">결과물 산출 기준<select value={yieldPolicy} onChange={(event) => props.onYieldPolicyChange?.(event.target.value as YieldPolicy)}>{YIELD_POLICIES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select><small>선택한 산출량 기준으로 목표 수량을 제작 횟수와 재료 수량으로 환산합니다. 기대 산출량이 검증되지 않은 제작법은 보수적으로 최소 산출량을 사용합니다.</small></label> : null}
    {mode === 'durability' && skill === 'cooking' ? <label className="field plan-policy-field">대량 요리 준비 기준<select value={cookingPreparationPolicy} onChange={(event) => props.onCookingPreparationPolicyChange(event.target.value as CookingPreparationPolicy)}>{PREPARATION_POLICIES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select><small>체크리스트와 무게 계산에는 선택한 기준의 실제 재료 회분을 사용합니다.</small></label> : null}
  </>
}
