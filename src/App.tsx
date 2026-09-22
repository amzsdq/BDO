import { useEffect, useMemo, useState } from 'react'
import { verifiedAlchemyMasteryRow } from './domain/alchemyMastery'
import { searchRecipes } from './domain/search'
import type { RecipeDataset, RecipeId } from './domain/types'
import type { CookingPreparationPolicy } from './domain/durabilityPlan'
import type { PlanInputMode } from './data/planSession'
import { buildActivePlanView } from './data/activePlanView'
import { loadRuntimeDataset, type DatasetMode } from './data/runtime'
import { sampleDataset } from './data/sample'
import { readCharacterProfile, readChecklist, readInventory, writeCharacterProfile, writeChecklist, writeInventory } from './data/storage'
import { PlanTargetControls } from './PlanTargetControls'
import { ItemIcon } from './ItemIcon'

export function App() {
  const [dataset, setDataset] = useState<RecipeDataset>(sampleDataset)
  const [datasetMode, setDatasetMode] = useState<DatasetMode>('sample-fallback')
  const [datasetMessage, setDatasetMessage] = useState('데이터 불러오는 중…')
  const [skill, setSkill] = useState<'cooking' | 'alchemy'>('cooking')
  const [query, setQuery] = useState('')
  const [activeResultIndex, setActiveResultIndex] = useState(0)
  const [recipeId, setRecipeId] = useState<RecipeId>('sample-cooking')
  const [variantId, setVariantId] = useState<string | undefined>()
  const [mode, setMode] = useState<PlanInputMode>('servings')
  const [amount, setAmount] = useState(100)
  const [cookingPreparationPolicy, setCookingPreparationPolicy] = useState<CookingPreparationPolicy>('safe95')
  const [checked, setChecked] = useState<Record<string, boolean>>(() => readChecklist())
  const [inventory, setInventory] = useState<Record<string, number>>(() => readInventory())
  const [profile, setProfile] = useState(() => readCharacterProfile())

  useEffect(() => { void loadRuntimeDataset().then((loaded) => { setDataset(loaded.dataset); setDatasetMode(loaded.mode); setDatasetMessage(loaded.message); const first = Object.values(loaded.dataset.recipes).find((recipe) => recipe.skill === 'cooking'); if (first) { setRecipeId(first.id); setVariantId(first.variants[0]?.id) } }) }, [])
  useEffect(() => { writeChecklist(checked) }, [checked])
  useEffect(() => { writeInventory(inventory) }, [inventory])
  useEffect(() => { writeCharacterProfile(profile) }, [profile])

  const results = useMemo(() => searchRecipes(dataset, query, { skill, limit: 8 }), [dataset, query, skill])
  const searchOpen = Boolean(query.trim())
  const activeResult = results[activeResultIndex]
  const selectedRecipe = dataset.recipes[recipeId]
  const selectedVariant = selectedRecipe?.variants.find((variant) => variant.id === variantId) ?? selectedRecipe?.variants[0]
  const selectedItem = selectedRecipe ? dataset.items[String(selectedRecipe.outputItemId)] : undefined
  const activePlan = useMemo(() => selectedRecipe ? buildActivePlanView(dataset, {
    recipeId: selectedRecipe.id,
    variantId: selectedVariant?.id,
    mode,
    amount,
    skill: selectedRecipe.skill,
    cookingPreparationPolicy: mode === 'durability' && selectedRecipe.skill === 'cooking' ? cookingPreparationPolicy : undefined,
  }, inventory, profile) : { estimatedPreparation: false }, [amount, cookingPreparationPolicy, dataset, inventory, mode, profile, selectedRecipe, selectedVariant])
  const plan = activePlan.plan
  const requestedServings = activePlan.materialServings
  const batch = activePlan.batch
  const alchemyMastery = useMemo(() => skill === 'alchemy' && profile.alchemyMastery != null ? verifiedAlchemyMasteryRow(profile.alchemyMastery) ?? null : null, [profile.alchemyMastery, skill])

  function changeSkill(next: 'cooking' | 'alchemy') { setSkill(next); setQuery(''); setActiveResultIndex(0); const first = Object.values(dataset.recipes).find((recipe) => recipe.skill === next); if (first) { setRecipeId(first.id); setVariantId(first.variants[0]?.id) } }
  function chooseRecipe(nextRecipeId: RecipeId) { const recipe = dataset.recipes[nextRecipeId]; setRecipeId(nextRecipeId); setVariantId(recipe?.variants[0]?.id) }
  function selectSearchResult(index: number) { const result = results[index]; if (!result) return; chooseRecipe(result.recipe.id); setQuery(''); setActiveResultIndex(0) }
  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) { if (event.key === 'Escape' && searchOpen) { event.preventDefault(); setQuery(''); setActiveResultIndex(0); return } if (!searchOpen || !results.length) return; if (event.key === 'ArrowDown') { event.preventDefault(); setActiveResultIndex((current) => (current + 1) % results.length) } else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveResultIndex((current) => (current - 1 + results.length) % results.length) } else if (event.key === 'Enter') { event.preventDefault(); selectSearchResult(activeResultIndex) } }
  function setProfileNumber(key: 'maxWeightLT' | 'reservedWeightLT' | 'cookingMastery' | 'alchemyMastery', raw: string) { const value = raw === '' ? undefined : Math.max(0, Number(raw) || 0); setProfile((current) => ({ ...current, [key]: value })) }
  function setOwned(itemId: string, raw: string) { const value = Math.max(0, Number(raw) || 0); setInventory((current) => ({ ...current, [itemId]: value })) }
  const pct = (value: number) => `${(value * 100).toFixed(2)}%`

  return <main className="app-shell">
    <header className="hero"><div><p className="eyebrow">BLACK DESERT · 생활 준비</p><h1>요리·연금 준비를 한 화면에서</h1><p className="hero-copy">목표 수량이나 도구 사용 횟수를 입력하면 필요한 재료를 바로 계산하고, 준비한 항목을 체크하세요.</p></div><span className={`status-pill ${datasetMode}`}>{datasetMode === 'verified' ? 'KR · 검증 완료' : 'KR · 검증 중'}</span></header>
    {datasetMode !== 'verified' && <p className="data-notice" role="status">{datasetMessage}</p>}
    <section className="planner-grid"><aside className="panel controls">
      <div className="section-heading"><span>01</span><div><strong>무엇을 만들까요?</strong><small>이름을 입력하면 바로 찾습니다.</small></div></div>
      <div className="segmented skill-tabs" aria-label="생활 콘텐츠"><button className={skill === 'cooking' ? 'active' : ''} onClick={() => changeSkill('cooking')}>요리</button><button className={skill === 'alchemy' ? 'active' : ''} onClick={() => changeSkill('alchemy')}>연금</button></div>
      <div className="search-wrap"><label className="field"><span>제작물 검색</span><input value={query} onChange={(e) => { setQuery(e.target.value); setActiveResultIndex(0) }} onKeyDown={handleSearchKeyDown} placeholder={selectedItem?.nameKo ?? '예: 맥주'} aria-label="제작물 검색" role="combobox" aria-autocomplete="list" aria-expanded={searchOpen} aria-controls="recipe-search-results" aria-activedescendant={searchOpen && activeResult ? `recipe-option-${activeResult.recipe.id}` : undefined} autoComplete="off" /></label>{searchOpen && <div id="recipe-search-results" className="search-results" role="listbox" aria-label="검색 결과">{results.length ? results.map(({ recipe, item }, index) => <button id={`recipe-option-${recipe.id}`} key={recipe.id} role="option" aria-selected={index === activeResultIndex} onMouseEnter={() => setActiveResultIndex(index)} onClick={() => selectSearchResult(index)}><span>{item.nameKo}</span><small>{recipe.skill === 'cooking' ? '요리' : '연금'}</small></button>) : <p>일치하는 제작물이 없습니다.</p>}</div>}</div>
      <div className="selected-target"><small>선택한 제작물</small><strong>{selectedItem?.nameKo ?? '선택 필요'}</strong></div>
      {selectedRecipe && selectedRecipe.variants.length > 1 && <label className="field"><span>재료 조합</span><select value={selectedVariant?.id ?? ''} onChange={(e) => setVariantId(e.target.value)}>{selectedRecipe.variants.map((variant, index) => <option key={variant.id} value={variant.id}>조합 {index + 1} · {variant.inputs.map((input) => `${dataset.items[String(input.itemId)]?.nameKo ?? `#${input.itemId}`} ×${input.count}`).join(' + ')}</option>)}</select><small>선택한 조합은 준비 목록과 무게 계산에 동일하게 적용됩니다.</small></label>}
      <PlanTargetControls skill={selectedRecipe?.skill ?? skill} mode={mode} amount={amount} cookingPreparationPolicy={cookingPreparationPolicy} onModeChange={setMode} onAmountChange={setAmount} onCookingPreparationPolicyChange={setCookingPreparationPolicy} />
      <details className="profile-card"><summary>캐릭터 설정 · 무게/숙련도</summary><div className="profile-grid"><label className="field"><span>최대 무게 (LT)</span><input type="number" min="0" value={profile.maxWeightLT ?? ''} onChange={(e) => setProfileNumber('maxWeightLT', e.target.value)} /></label><label className="field"><span>예약 무게 (LT)</span><input type="number" min="0" value={profile.reservedWeightLT ?? ''} onChange={(e) => setProfileNumber('reservedWeightLT', e.target.value)} /></label><label className="field"><span>요리 숙련도</span><input type="number" min="0" value={profile.cookingMastery ?? ''} onChange={(e) => setProfileNumber('cookingMastery', e.target.value)} /></label><label className="field"><span>연금 숙련도</span><input type="number" min="0" value={profile.alchemyMastery ?? ''} onChange={(e) => setProfileNumber('alchemyMastery', e.target.value)} /></label></div><small>숙련도는 요리·연금을 별도로 저장합니다. 확률 효과는 검증된 표의 정확한 숙련도 값에서만 계산합니다.</small></details>
      {activePlan.error && <p className="data-notice" role="alert">{activePlan.error}</p>}
      <div className="summary-card"><span>실제 준비 재료</span><strong>{requestedServings?.toLocaleString() ?? '—'}회분</strong><small>{activePlan.estimatedPreparation ? '선택한 확률 준비 기준으로 계산한 추정치입니다.' : '체크리스트와 무게 계산이 같은 재료 회분을 사용합니다.'}</small></div>
      {plan?.warnings.map((warning) => <p className="data-notice" role="status" key={warning}>{warning}</p>)}
      {skill === 'alchemy' && profile.alchemyMastery != null && <div className="summary-card"><span>연금 숙련도 산출 효과</span>{alchemyMastery ? <><strong>최대 수량 확률 {pct(alchemyMastery.maxOutputProbability)}</strong><small>일반 추가 {pct(alchemyMastery.normalExtraProbability)} · 특수 추가 {pct(alchemyMastery.specialExtraProbability)} · 희귀 추가 {pct(alchemyMastery.rareExtraProbability)}. 입력 재료 소모량이나 확정 산출량으로 환산하지 않습니다.</small></> : <><strong>검증된 숙련도 필요</strong><small>공식 표의 검증된 숙련도 값만 표시하며 중간값은 임의 보간하지 않습니다.</small></>}</div>}
      {profile.maxWeightLT != null && <div className="summary-card batch-summary"><span>요청 작업 재료 적재</span><strong>{requestedServings != null && batch?.totalStartingIngredientWeightLT != null ? `${requestedServings.toLocaleString()}회분 · ${batch.totalStartingIngredientWeightLT.toFixed(2)} LT` : batch?.maxServings != null ? `최대 ${batch.maxServings.toLocaleString()}회분` : '계산 보류'}</strong><small>{batch?.ingredientWeightPerServingLT != null ? `가용 ${batch.availableWeightLT.toLocaleString()} LT · 1회분 ${batch.ingredientWeightPerServingLT.toFixed(2)} LT · 최대 적재 ${batch.maxServings?.toLocaleString() ?? '—'}회분` : batch?.warnings[0] ?? '검증된 재료 무게가 필요합니다.'}</small>{batch?.warnings.map((warning) => <small key={warning} role="status">{warning}</small>)}{batch?.lines.length ? <ul className="carry-lines">{batch.lines.map((line) => <li key={line.itemId}><span>{dataset.items[String(line.itemId)]?.nameKo ?? `아이템 #${line.itemId}`}</span><strong>{line.countToCarry.toLocaleString()}개</strong></li>)}</ul> : null}</div>}
    </aside><section className="panel checklist"><div className="section-heading"><span>02</span><div><strong>준비 체크리스트</strong><small>보유 수량과 체크 상태는 이 기기에 자동 저장됩니다.</small></div></div><div className="material-list">{plan?.materials.map((material) => { const key = String(material.itemId); const item = dataset.items[key]; const done = checked[key] ?? false; const owned = inventory[key] ?? 0; return <label className={`material-row ${done ? 'done' : ''}`} key={material.itemId}><input type="checkbox" checked={done} onChange={(e) => setChecked((current) => ({ ...current, [key]: e.target.checked }))} /><ItemIcon item={item} /><div className="material-name"><strong>{item?.nameKo ?? `아이템 #${material.itemId}`}</strong><small>{material.craftedIntermediate ? '중간재' : '재료'}</small></div><div className="quantity"><span>필요</span><strong>{material.required.toLocaleString()}</strong></div><div className="quantity owned"><span>보유</span><input aria-label={`${item?.nameKo ?? `아이템 #${material.itemId}`} 보유 수량`} type="number" min="0" value={owned} onChange={(e) => setOwned(key, e.target.value)} /></div><div className="quantity missing"><span>부족</span><strong>{material.missing.toLocaleString()}</strong></div></label> })}</div></section></section>
  </main>
}
