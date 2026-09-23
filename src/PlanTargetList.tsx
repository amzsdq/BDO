import type { RecipeDataset } from './domain/types'
import type { PlanSessionState } from './data/planSession'
import { ItemIcon } from './ItemIcon'
import './PlanTargetList.css'

export interface PlanTargetListProps {
  dataset: RecipeDataset
  session: PlanSessionState
  activeIndex: number
  onSelect: (index: number) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

/**
 * Compact batch navigation for the canonical persisted targets[].
 * It deliberately edits no target data itself: App owns session mutations,
 * while this surface makes simultaneous targets visible instead of collapsing
 * the planner back to one transient recipe.
 */
export function PlanTargetList({ dataset, session, activeIndex, onSelect, onAdd, onRemove }: PlanTargetListProps) {
  return <section className="plan-target-list" aria-label="동시 제작 목표">
    <div className="section-heading">
      <span>+</span>
      <div><strong>동시 제작 목표</strong><small>여러 요리·연금 목표의 재료를 한 번에 합산합니다.</small></div>
    </div>
    <div role="list" className="target-chips">
      {session.targets.map((target, index) => {
        const recipe = dataset.recipes[target.recipeId]
        const item = recipe ? dataset.items[String(recipe.outputItemId)] : undefined
        const label = item?.nameKo ?? `목표 ${index + 1}`
        return <div role="listitem" key={`${index}:${target.recipeId}`} className="target-chip">
          <button type="button" aria-pressed={index === activeIndex} onClick={() => onSelect(index)}>
            <ItemIcon item={item} />
            <span className="target-chip-label"><span>{label} · {target.amount.toLocaleString()}</span>{item && <small>#{item.id}</small>}</span>
          </button>
          {session.targets.length > 1 && <button type="button" aria-label={`${label} 목표 제거`} onClick={() => onRemove(index)}>×</button>}
        </div>
      })}
      <button type="button" onClick={onAdd}>목표 추가</button>
    </div>
  </section>
}
