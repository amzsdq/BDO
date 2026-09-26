import { useId, useMemo, useState } from 'react'
import type { ItemId, RecipeDataset } from './domain/types'

interface SubstitutionItemPickerProps {
  dataset: RecipeDataset
  groupId: string
  memberItemIds: readonly ItemId[]
  selectedItemId?: ItemId
  onChange: (itemId: string) => void
}

const RESULT_LIMIT = 40

export function SubstitutionItemPicker({ dataset, groupId, memberItemIds, selectedItemId, onChange }: SubstitutionItemPickerProps) {
  const inputId = useId()
  const listboxId = `${inputId}-results`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selectedName = selectedItemId == null ? '' : dataset.items[String(selectedItemId)]?.nameKo ?? `아이템 #${selectedItemId}`

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR')
    const entries = memberItemIds.map((itemId) => ({
      itemId,
      name: dataset.items[String(itemId)]?.nameKo ?? `아이템 #${itemId}`,
    }))
    if (!normalized) return entries.slice(0, RESULT_LIMIT)
    return entries.filter(({ itemId, name }) =>
      name.toLocaleLowerCase('ko-KR').includes(normalized) || String(itemId).includes(normalized),
    ).slice(0, RESULT_LIMIT)
  }, [dataset, memberItemIds, query])

  function choose(itemId: ItemId) {
    onChange(String(itemId))
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      if (!open) return
      event.preventDefault()
      setOpen(false)
      setActiveIndex(0)
      return
    }
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        setOpen(true)
      }
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(results[activeIndex].itemId)
    }
  }

  return <div className="substitution-picker">
    <div className="substitution-picker-row">
      <input
        id={inputId}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={selectedName || '대체 재료 이름 또는 아이템 ID 검색'}
        aria-label="대체 재료 검색"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && results[activeIndex] ? `${inputId}-option-${results[activeIndex].itemId}` : undefined}
        autoComplete="off"
      />
      {selectedItemId != null && <button type="button" onClick={() => { onChange(''); setQuery(''); setOpen(false) }}>자동 선택</button>}
    </div>
    {selectedItemId != null && <small className="substitution-selected">직접 선택: {selectedName}</small>}
    {open && <div id={listboxId} className="substitution-results" role="listbox" aria-label="대체 재료 검색 결과">
      {results.length ? results.map(({ itemId, name }, index) => <button
        id={`${inputId}-option-${itemId}`}
        type="button"
        role="option"
        aria-selected={itemId === selectedItemId}
        className={index === activeIndex ? 'active' : undefined}
        key={itemId}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => choose(itemId)}
      ><span>{name}</span><small>#{itemId}</small></button>) : <p>일치하는 대체 재료가 없습니다.</p>}
      {memberItemIds.length > RESULT_LIMIT && !query.trim() && <p>처음 {RESULT_LIMIT}개만 표시합니다. 이름이나 아이템 ID로 검색하세요.</p>}
    </div>}
  </div>
}
