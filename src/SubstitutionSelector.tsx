import { useMemo, useState } from 'react'
import type { ItemId } from './domain/types'

type Props = {
  groupId: string
  canonicalName: string
  memberItemIds: ItemId[]
  selectedItemId?: ItemId
  itemName: (id: ItemId) => string
  onSelect: (itemId: ItemId | undefined) => void
}

const VISIBLE_LIMIT = 20

export function SubstitutionSelector({ groupId, canonicalName, memberItemIds, selectedItemId, itemName, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const normalized = query.trim().toLocaleLowerCase('ko-KR')
  const matches = useMemo(() => memberItemIds
    .filter((id) => !normalized || itemName(id).toLocaleLowerCase('ko-KR').includes(normalized) || String(id).includes(normalized))
    .slice(0, VISIBLE_LIMIT), [itemName, memberItemIds, normalized])
  const open = Boolean(normalized)
  const activeId = matches[Math.min(activeIndex, Math.max(0, matches.length - 1))]
  const listId = `substitution-options-${groupId}`

  function choose(id: ItemId | undefined) {
    onSelect(id)
    setQuery('')
    setActiveIndex(0)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setQuery('')
      setActiveIndex(0)
      return
    }
    if (!open || !matches.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % matches.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(activeId)
    }
  }

  return <div className="field substitution-selector">
    <span>{canonicalName} · 대체 재료 {memberItemIds.length.toLocaleString()}종</span>
    <div className="substitution-search">
      <input
        value={query}
        onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }}
        onKeyDown={onKeyDown}
        placeholder={selectedItemId ? itemName(selectedItemId) : '대체 재료 검색'}
        aria-label={`${canonicalName} 대체 재료 검색`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeId != null ? `substitution-option-${groupId}-${activeId}` : undefined}
        autoComplete="off"
      />
      {open && <div id={listId} className="substitution-results" role="listbox" aria-label={`${canonicalName} 대체 재료 검색 결과`}>
        <button type="button" role="option" aria-selected={selectedItemId == null} onClick={() => choose(undefined)}>보유량 기준 자동 선택</button>
        {matches.map((id, index) => <button
          type="button"
          id={`substitution-option-${groupId}-${id}`}
          key={id}
          role="option"
          aria-selected={id === selectedItemId}
          className={index === activeIndex ? 'active' : undefined}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => choose(id)}
        >{itemName(id)}</button>)}
        {!matches.length && <p>일치하는 대체 재료가 없습니다.</p>}
        {memberItemIds.length > VISIBLE_LIMIT && matches.length === VISIBLE_LIMIT && <small>검색 결과 상위 {VISIBLE_LIMIT}개만 표시합니다.</small>}
      </div>}
    </div>
    <small>{selectedItemId ? `직접 선택: ${itemName(selectedItemId)}` : '보유량 기준 자동 선택 중'} · 준비 목록과 무게 계산에 같은 대체 비율을 적용합니다.</small>
  </div>
}
