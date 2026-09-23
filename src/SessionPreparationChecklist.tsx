import type { Dispatch, SetStateAction } from 'react'
import type { RecipeDataset } from './domain/types'
import type { ChecklistState, InventoryState } from './data/storage'
import type { SessionPlanResult } from './data/sessionPlan'
import { ItemIcon } from './ItemIcon'

export type SessionPreparationChecklistProps = {
  dataset: RecipeDataset
  result: SessionPlanResult
  checked: ChecklistState
  setChecked: Dispatch<SetStateAction<ChecklistState>>
  inventory: InventoryState
  setInventory: Dispatch<SetStateAction<InventoryState>>
}

/** Visible checklist for the aggregate persisted session, never just the active target projection. */
export function SessionPreparationChecklist({ dataset, result, checked, setChecked, inventory, setInventory }: SessionPreparationChecklistProps) {
  function setOwned(itemId: string, raw: string) {
    const value = Math.max(0, Number(raw) || 0)
    setInventory((current) => ({ ...current, [itemId]: value }))
  }

  return <section className="panel checklist">
    <div className="section-heading"><span>02</span><div><strong>준비 체크리스트</strong><small>모든 동시 제작 목표의 재료를 합산합니다. 보유 수량과 체크 상태는 이 기기에 자동 저장됩니다.</small></div></div>
    {result.errors.length > 0 && <div className="data-notice" role="alert"><strong>전체 준비 목록을 계산할 수 없습니다.</strong>{result.errors.map((error) => <small key={error}>{error}</small>)}</div>}
    {result.plan?.warnings.map((warning) => <p className="data-notice" role="status" key={warning}>{warning}</p>)}
    <div className="material-list">{result.plan?.materials.map((material) => {
      const key = String(material.itemId)
      const item = dataset.items[key]
      const done = checked[key] ?? false
      const owned = inventory[key] ?? 0
      return <label className={`material-row ${done ? 'done' : ''}`} key={material.itemId}>
        <input type="checkbox" checked={done} onChange={(event) => setChecked((current) => ({ ...current, [key]: event.target.checked }))} />
        <ItemIcon item={item} />
        <div className="material-name"><strong>{item?.nameKo ?? `아이템 #${material.itemId}`}</strong><small>{material.craftedIntermediate ? '중간재' : '재료'}</small></div>
        <div className="quantity"><span>필요</span><strong>{material.required.toLocaleString()}</strong></div>
        <div className="quantity owned"><span>보유</span><input aria-label={`${item?.nameKo ?? `아이템 #${material.itemId}`} 보유 수량`} type="number" min="0" value={owned} onChange={(event) => setOwned(key, event.target.value)} /></div>
        <div className="quantity missing"><span>부족</span><strong>{material.missing.toLocaleString()}</strong></div>
      </label>
    })}</div>
  </section>
}
