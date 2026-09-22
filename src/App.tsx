import { useEffect, useMemo, useState } from 'react'
import { buildPlan } from './domain/planner'
import { searchRecipes } from './domain/search'
import type { RecipeDataset, RecipeId } from './domain/types'
import { loadRuntimeDataset, type DatasetMode } from './data/runtime'
import { sampleDataset } from './data/sample'
import { readChecklist, writeChecklist } from './data/storage'

export function App() {
  const [dataset, setDataset] = useState<RecipeDataset>(sampleDataset)
  const [datasetMode, setDatasetMode] = useState<DatasetMode>('sample-fallback')
  const [datasetMessage, setDatasetMessage] = useState('데이터 불러오는 중…')
  const [skill, setSkill] = useState<'cooking' | 'alchemy'>('cooking')
  const [query, setQuery] = useState('')
  const [recipeId, setRecipeId] = useState<RecipeId>('sample-cooking')
  const [mode, setMode] = useState<'output' | 'attempts'>('attempts')
  const [amount, setAmount] = useState(100)
  const [checked, setChecked] = useState<Record<string, boolean>>(() => readChecklist())

  useEffect(() => {
    void loadRuntimeDataset().then((loaded) => {
      setDataset(loaded.dataset)
      setDatasetMode(loaded.mode)
      setDatasetMessage(loaded.message)
      const first = Object.values(loaded.dataset.recipes).find((recipe) => recipe.skill === 'cooking')
      if (first) setRecipeId(first.id)
    })
  }, [])

  useEffect(() => {
    writeChecklist(checked)
  }, [checked])

  const results = useMemo(() => searchRecipes(dataset, query, { skill, limit: 8 }), [dataset, query, skill])
  const selectedRecipe = dataset.recipes[recipeId]
  const selectedItem = selectedRecipe ? dataset.items[String(selectedRecipe.outputItemId)] : undefined
  const plan = useMemo(() => {
    if (!selectedRecipe) return null
    return buildPlan(dataset, [{ recipeId: selectedRecipe.id, mode, amount }], { craftIntermediateItemIds: new Set() })
  }, [amount, dataset, mode, selectedRecipe])

  function changeSkill(next: 'cooking' | 'alchemy') {
    setSkill(next)
    setQuery('')
    const first = Object.values(dataset.recipes).find((recipe) => recipe.skill === next)
    if (first) setRecipeId(first.id)
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">BLACK DESERT · 생활 준비</p>
          <h1>요리·연금 준비를 한 화면에서</h1>
          <p className="hero-copy">목표 수량이나 도구 사용 횟수를 입력하면 필요한 재료를 바로 계산하고, 준비한 항목을 체크하세요.</p>
        </div>
        <span className={`status-pill ${datasetMode}`}>{datasetMode === 'verified' ? 'KR · 검증 완료' : 'KR · 검증 중'}</span>
      </header>

      {datasetMode !== 'verified' && <p className="data-notice" role="status">{datasetMessage}</p>}

      <section className="planner-grid">
        <aside className="panel controls">
          <div className="section-heading"><span>01</span><div><strong>무엇을 만들까요?</strong><small>이름을 입력하면 바로 찾습니다.</small></div></div>
          <div className="segmented skill-tabs" aria-label="생활 콘텐츠">
            <button className={skill === 'cooking' ? 'active' : ''} onClick={() => changeSkill('cooking')}>요리</button>
            <button className={skill === 'alchemy' ? 'active' : ''} onClick={() => changeSkill('alchemy')}>연금</button>
          </div>
          <div className="search-wrap">
            <label className="field"><span>제작물 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={selectedItem?.nameKo ?? '예: 맥주'} aria-label="제작물 검색" autoComplete="off" /></label>
            {query.trim() && <div className="search-results" role="listbox" aria-label="검색 결과">
              {results.length ? results.map(({ recipe, item }) => <button key={recipe.id} role="option" aria-selected={recipe.id === recipeId} onClick={() => { setRecipeId(recipe.id); setQuery('') }}><span>{item.nameKo}</span><small>{recipe.skill === 'cooking' ? '요리' : '연금'}</small></button>) : <p>일치하는 제작물이 없습니다.</p>}
            </div>}
          </div>
          <div className="selected-target"><small>선택한 제작물</small><strong>{selectedItem?.nameKo ?? '선택 필요'}</strong></div>
          <div className="segmented" aria-label="계산 기준">
            <button className={mode === 'output' ? 'active' : ''} onClick={() => setMode('output')}>목표 수량</button>
            <button className={mode === 'attempts' ? 'active' : ''} onClick={() => setMode('attempts')}>도구 사용 횟수</button>
          </div>
          <label className="field"><span>{mode === 'output' ? '목표 수량' : '사용 횟수'}</span><input type="number" min={1} value={amount} onChange={(event) => setAmount(Math.max(1, Number(event.target.value) || 1))} /></label>
          <div className="summary-card"><span>예상 작업</span><strong>{plan?.crafts[0]?.attempts.toLocaleString() ?? '—'}회</strong><small>변동 산출량은 검증된 범위 안에서 보수적으로 계산합니다.</small></div>
        </aside>

        <section className="panel checklist">
          <div className="section-heading"><span>02</span><div><strong>준비 체크리스트</strong><small>체크 상태는 이 기기에 자동 저장됩니다.</small></div></div>
          <div className="material-list">
            {plan?.materials.map((material) => {
              const item = dataset.items[String(material.itemId)]
              const done = checked[String(material.itemId)] ?? false
              return <label className={`material-row ${done ? 'done' : ''}`} key={material.itemId}>
                <input type="checkbox" checked={done} onChange={(event) => setChecked((current) => ({ ...current, [String(material.itemId)]: event.target.checked }))} />
                <div className="item-icon" aria-hidden="true">?</div>
                <div className="material-name"><strong>{item?.nameKo ?? `아이템 #${material.itemId}`}</strong><small>{material.craftedIntermediate ? '중간재' : '재료'}</small></div>
                <div className="quantity"><span>필요</span><strong>{material.required.toLocaleString()}</strong></div>
                <div className="quantity missing"><span>부족</span><strong>{material.missing.toLocaleString()}</strong></div>
              </label>
            })}
          </div>
        </section>
      </section>
    </main>
  )
}
