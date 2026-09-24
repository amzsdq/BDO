import type { RecipeDataset, YieldPolicy } from './domain/types'
import type { PersistedPlanTarget, PlanSessionState } from './data/planSession'
import { ItemIcon } from './ItemIcon'
import './PlanTargetList.css'

export interface PlanTargetListProps { dataset: RecipeDataset; session: PlanSessionState; activeIndex: number; onSelect: (index: number) => void; onAdd: () => void; onRemove: (index: number) => void }

const YIELD_LABEL: Record<YieldPolicy, string> = { minimum: '최소 산출', expected: '기대 산출', maximum: '최대 산출' }
function targetContext(target: PersistedPlanTarget): string {
  if (target.mode === 'output') return `결과 ${target.amount.toLocaleString()} · ${YIELD_LABEL[target.yieldPolicy ?? 'minimum']}`
  if (target.mode === 'servings') return `재료 ${target.amount.toLocaleString()}회분`
  const policy = target.cookingPreparationPolicy ? ` · ${target.cookingPreparationPolicy === 'safe95' ? '95% 안전' : target.cookingPreparationPolicy === 'minimum' ? '최소' : target.cookingPreparationPolicy === 'expected' ? '기대' : '최대'}` : ''
  return `도구 ${target.amount.toLocaleString()}회${policy}`
}

/** Compact batch navigation for canonical persisted targets, including the plan semantics that change material totals. */
export function PlanTargetList({ dataset, session, activeIndex, onSelect, onAdd, onRemove }: PlanTargetListProps) {
  return <section className="plan-target-list" aria-label="동시 제작 목표">
    <div className="section-heading"><span>+</span><div><strong>동시 제작 목표</strong><small>여러 요리·연금 목표의 재료를 한 번에 합산합니다.</small></div></div>
    <div role="list" className="target-chips">
      {session.targets.map((target, index) => {
        const recipe = dataset.recipes[target.recipeId]
        const item = recipe ? dataset.items[String(recipe.outputItemId)] : undefined
        const label = item?.nameKo ?? `목표 ${index + 1}`
        return <div role="listitem" key={`${index}:${target.recipeId}`} className="target-chip">
          <button type="button" aria-pressed={index === activeIndex} onClick={() => onSelect(index)}>
            <ItemIcon item={item} />
            <span className="target-chip-label"><span>{label}</span><small>{targetContext(target)}{item ? ` · #${item.id}` : ''}</small></span>
          </button>
          {session.targets.length > 1 && <button type="button" aria-label={`${label} 목표 제거`} onClick={() => onRemove(index)}>×</button>}
        </div>
      })}
      <button type="button" onClick={onAdd}>목표 추가</button>
    </div>
  </section>
}
