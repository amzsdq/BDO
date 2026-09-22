import type { ItemId, RecipeDataset, RecipeId, RecipeVariant } from './domain/types'
import { listIntermediateCraftChoices } from './domain/intermediateChoices'

export interface IntermediateCraftControlsProps {
  dataset: RecipeDataset
  variant: RecipeVariant | undefined
  craftItemIds: ReadonlySet<ItemId>
  producerByItemId: Readonly<Record<string, RecipeId>>
  onCraftChange: (itemId: ItemId, craft: boolean) => void
  onProducerChange: (itemId: ItemId, recipeId: RecipeId) => void
}

/** Compact opt-in recursion controls; external acquisition remains the low-friction default. */
export function IntermediateCraftControls(props: IntermediateCraftControlsProps) {
  const choices = listIntermediateCraftChoices(props.dataset, props.variant)
  if (!choices.length) return null
  return <details className="profile-card"><summary>중간재 직접 제작</summary><div className="profile-grid">{choices.map((choice) => {
    const crafting = props.craftItemIds.has(choice.itemId)
    const item = props.dataset.items[String(choice.itemId)]
    const selectedProducer = props.producerByItemId[String(choice.itemId)] ?? choice.recipeIds[0]
    return <div className="field" key={choice.itemId}>
      <label><input type="checkbox" checked={crafting} onChange={(event) => props.onCraftChange(choice.itemId, event.target.checked)} /> {item?.nameKo ?? `아이템 #${choice.itemId}`} 직접 제작</label>
      {crafting && choice.recipeIds.length > 1 ? <label><span>제작법</span><select value={selectedProducer} onChange={(event) => props.onProducerChange(choice.itemId, event.target.value)}>{choice.recipeIds.map((recipeId) => <option key={recipeId} value={recipeId}>{props.dataset.items[String(props.dataset.recipes[recipeId]?.outputItemId)]?.nameKo ?? recipeId} · {recipeId}</option>)}</select></label> : null}
    </div>
  })}</div><small>체크하지 않은 중간재는 외부 조달로 계산합니다. 직접 제작을 선택하면 하위 재료를 재귀적으로 펼칩니다.</small></details>
}
