import { useMemo, useState } from 'react'
import { verifiedAlchemyMasteryRow } from './domain/alchemyMastery'
import { searchRecipes } from './domain/search'
import type { ItemId, RecipeId, YieldPolicy } from './domain/types'
import type { CookingPreparationPolicy } from './domain/durabilityPlan'
import type { PlannerBootstrap } from './data/plannerBootstrap'
import { buildActivePlanView } from './data/activePlanView'
import { activeSessionTarget, updateActiveSessionTarget, updateActiveSessionTargetMode } from './data/activeSessionTarget'
import { replacePlanTarget, selectTargetVariant } from './data/planSessionTargets'
import { addDefaultTarget, removeTargetAndSelect, switchTargetSkill } from './data/activeTargetSelection'
import { buildPlanFromSession } from './data/sessionPlan'
import { parseOptionalNonNegativeFinite } from './data/numericInput'
import { PlanTargetControls } from './PlanTargetControls'
import { PlanTargetList } from './PlanTargetList'
import { SessionPreparationChecklist } from './SessionPreparationChecklist'
import { PlannerStateActions } from './PlannerStateActions'
import { IntermediateCraftControls } from './IntermediateCraftControls'
import { SkillTabs, type PlannerSkill } from './SkillTabs'
import { useReadyPlannerState } from './useReadyPlannerState'

type ReadyBootstrap = Omit<PlannerBootstrap, 'hydration'> & { hydration: Extract<PlannerBootstrap['hydration'], { status: 'ready' }> }

export function App({ bootstrap }: { bootstrap: ReadyBootstrap }) {
  const dataset = bootstrap.dataset
  const datasetMode = bootstrap.datasetMode
  const datasetMessage = bootstrap.datasetMessage
  const { session, setSession, checklist: checked, setChecklist: setChecked, inventory, setInventory, profile, setProfile } = useReadyPlannerState(bootstrap)
  const [activeTargetIndex, setActiveTargetIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [activeResultIndex, setActiveResultIndex] = useState(0)

  const activeIndex = Math.min(activeTargetIndex, Math.max(0, session.targets.length - 1))
  const active = activeSessionTarget(dataset, session, activeIndex)
  const selectedRecipe = active ? dataset.recipes[active.recipeId] : undefined
  const selectedVariant = selectedRecipe?.variants.find((variant) => variant.id === active?.variantId) ?? selectedRecipe?.variants[0]
  const selectedItem = selectedRecipe ? dataset.items[String(selectedRecipe.outputItemId)] : undefined
  const skill = selectedRecipe?.skill ?? 'cooking'
  const mode = active?.target.mode ?? 'servings'
  const amount = active?.target.amount ?? 1
  const yieldPolicy: YieldPolicy = active?.target.yieldPolicy ?? 'minimum'
  const cookingPreparationPolicy: CookingPreparationPolicy = active?.target.cookingPreparationPolicy ?? 'safe95'
  const craftIntermediateItemIds = useMemo(() => new Set<ItemId>(session.craftIntermediateItemIds as ItemId[]), [session.craftIntermediateItemIds])
  const intermediateRecipeIdByItemId = session.intermediateRecipeIdByItemId as Record<string, RecipeId>

  const results = useMemo(() => searchRecipes(dataset, query, { skill, limit: 8 }), [dataset, query, skill])
  const searchOpen = Boolean(query.trim())
  const activeResult = results[activeResultIndex]
  const activePlan = useMemo(() => selectedRecipe ? buildActivePlanView(dataset, {
    recipeId: selectedRecipe.id, variantId: selectedVariant?.id, mode, amount, skill: selectedRecipe.skill,
    yieldPolicy: mode === 'output' ? yieldPolicy : undefined,
    cookingPreparationPolicy: mode === 'durability' && selectedRecipe.skill === 'cooking' ? cookingPreparationPolicy : undefined,
  }, inventory, profile, { craftIntermediateItemIds, intermediateRecipeIdByItemId, selectedSubstitutionItemIdByGroupId: session.selectedSubstitutionItemIdByGroupId }) : { estimatedPreparation: false }, [amount, cookingPreparationPolicy, craftIntermediateItemIds, dataset, intermediateRecipeIdByItemId, inventory, mode, profile, selectedRecipe, selectedVariant, yieldPolicy])
  const sessionPlan = useMemo(() => buildPlanFromSession(dataset, session, inventory, profile), [dataset, inventory, profile, session])
  const requestedServings = activePlan.materialServings
  const batch = activePlan.batch
  const alchemyMastery = useMemo(() => skill === 'alchemy' && profile.alchemyMastery != null ? verifiedAlchemyMasteryRow(profile.alchemyMastery) ?? null : null, [profile.alchemyMastery, skill])

  function patchActive(patch: Parameters<typeof updateActiveSessionTarget>[2]) { if (!active) return; setSession((current) => updateActiveSessionTarget(current, active.index, patch)) }
  function chooseRecipe(nextRecipeId: RecipeId) { if (!active) return; const recipe = dataset.recipes[nextRecipeId]; if (!recipe) return; setSession((current) => replacePlanTarget(current, active.index, { ...current.targets[active.index], recipeId: recipe.id, variantId: recipe.variants[0]?.id, cookingPreparationPolicy: current.targets[active.index].mode === 'durability' && recipe.skill === 'cooking' ? cookingPreparationPolicy : undefined })) }
  function selectSearchResult(index: number) { const result = results[index]; if (!result) return; chooseRecipe(result.recipe.id); setQuery(''); setActiveResultIndex(0) }
  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) { if (event.key === 'Escape' && searchOpen) { event.preventDefault(); setQuery(''); setActiveResultIndex(0); return } if (!searchOpen || !results.length) return; if (event.key === 'ArrowDown') { event.preventDefault(); setActiveResultIndex((current) => (current + 1) % results.length) } else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveResultIndex((current) => (current - 1 + results.length) % results.length) } else if (event.key === 'Enter') { event.preventDefault(); selectSearchResult(activeResultIndex) } }
  function setProfileNumber(key: 'maxWeightLT' | 'reservedWeightLT' | 'cookingMastery' | 'alchemyMastery', raw: string) { const value = parseOptionalNonNegativeFinite(raw); setProfile((current) => ({ ...current, [key]: value })) }
  function setIntermediateCraft(itemId: ItemId, craft: boolean) { setSession((current) => ({ ...current, craftIntermediateItemIds: craft ? [...new Set([...current.craftIntermediateItemIds, Number(itemId)])] : current.craftIntermediateItemIds.filter((id) => id !== Number(itemId)) })) }
  function setIntermediateProducer(itemId: ItemId, nextRecipeId: RecipeId) { setSession((current) => ({ ...current, intermediateRecipeIdByItemId: { ...current.intermediateRecipeIdByItemId, [String(itemId)]: String(nextRecipeId) } })) }
  function addTarget() { const next = addDefaultTarget(dataset, session, skill); setSession(next.session); setActiveTargetIndex(next.activeIndex) }
  function removeTarget(index: number) { const next = removeTargetAndSelect(session, index, activeIndex); setSession(next.session); setActiveTargetIndex(next.activeIndex) }
  function changeSkill(nextSkill: PlannerSkill) { if (nextSkill === skill) return; const next = switchTargetSkill(dataset, session, activeIndex, nextSkill); setSession(next.session); setActiveTargetIndex(next.activeIndex); setQuery(''); setActiveResultIndex(0) }
  const pct = (value: number) => `${(value * 100).toFixed(2)}%`

  if (!active || !selectedRecipe) return <main className="app-shell"><p className="data-notice" role="alert">저장된 제작 목표를 현재 데이터에서 찾을 수 없습니다.</p></main>

  return <main className="app-shell">
    <header className="hero"><div><p className="eyebrow">BLACK DESERT · 생활 준비</p><h1>요리·연금 준비를 한 화면에서</h1><p className="hero-copy">목표 수량이나 도구 사용 횟수를 입력하면 필요한 재료를 바로 계산하고, 준비한 항목을 체크하세요.</p></div><span className={`status-pill ${datasetMode}`}>{datasetMode === 'verified' ? 'KR · 검증 완료' : 'KR · 검증 중'}</span></header>
    {datasetMode !== 'verified' && <p className="data-notice" role="status">{datasetMessage}</p>}
    <PlanTargetList dataset={dataset} session={session} activeIndex={activeIndex} onSelect={setActiveTargetIndex} onAdd={addTarget} onRemove={removeTarget} />
    <section className="planner-grid"><aside className="panel controls">
      <div className="section-heading"><span>01</span><div><strong>무엇을 만들까요?</strong><small>이름을 입력하면 바로 찾습니다.</small></div></div>
      <SkillTabs skill={skill} onChange={changeSkill} />
      <div className="search-wrap"><label className="field"><span>제작물 검색</span><input value={query} onChange={(e) => { setQuery(e.target.value); setActiveResultIndex(0) }} onKeyDown={handleSearchKeyDown} placeholder={selectedItem?.nameKo ?? '예: 맥주'} aria-label="제작물 검색" role="combobox" aria-autocomplete="list" aria-expanded={searchOpen} aria-controls="recipe-search-results" aria-activedescendant={searchOpen && activeResult ? `recipe-option-${activeResult.recipe.id}` : undefined} autoComplete="off" /></label>{searchOpen && <div id="recipe-search-results" className="search-results" role="listbox" aria-label="검색 결과">{results.length ? results.map(({ recipe, item }, index) => <button id={`recipe-option-${recipe.id}`} key={recipe.id} role="option" aria-selected={index === activeResultIndex} onMouseEnter={() => setActiveResultIndex(index)} onClick={() => selectSearchResult(index)}><span>{item.nameKo}</span><small>{recipe.skill === 'cooking' ? '요리' : '연금'}</small></button>) : <p>일치하는 제작물이 없습니다.</p>}</div>}</div>
      <div className="selected-target"><small>선택한 제작물 · {skill === 'cooking' ? '요리' : '연금'}</small><strong>{selectedItem?.nameKo ?? '선택 필요'}</strong></div>
      {selectedRecipe.variants.length > 1 && <label className="field"><span>재료 조합</span><select value={selectedVariant?.id ?? ''} onChange={(e) => setSession((current) => selectTargetVariant(current, active.index, selectedRecipe.id, e.target.value))}>{selectedRecipe.variants.map((variant, index) => <option key={variant.id} value={variant.id}>조합 {index + 1} · {variant.inputs.map((input) => `${dataset.items[String(input.itemId)]?.nameKo ?? `#${input.itemId}`} ×${input.count}`).join(' + ')}</option>)}</select><small>선택한 조합은 준비 목록과 무게 계산에 동일하게 적용됩니다.</small></label>}
      <PlanTargetControls skill={skill} mode={mode} amount={amount} yieldPolicy={yieldPolicy} cookingPreparationPolicy={cookingPreparationPolicy} onModeChange={(next) => setSession((current) => updateActiveSessionTargetMode(current, active.index, skill, next, cookingPreparationPolicy, yieldPolicy))} onAmountChange={(next) => patchActive({ amount: next })} onYieldPolicyChange={(next) => patchActive({ yieldPolicy: next })} onCookingPreparationPolicyChange={(next) => patchActive({ cookingPreparationPolicy: next })} />
      <IntermediateCraftControls dataset={dataset} variant={selectedVariant} craftItemIds={craftIntermediateItemIds} producerByItemId={intermediateRecipeIdByItemId} onCraftChange={setIntermediateCraft} onProducerChange={setIntermediateProducer} />
      <details className="profile-card"><summary>캐릭터 설정 · 무게/숙련도</summary><div className="profile-grid"><label className="field"><span>최대 무게 (LT)</span><input type="number" min="0" value={profile.maxWeightLT ?? ''} onChange={(e) => setProfileNumber('maxWeightLT', e.target.value)} /></label><label className="field"><span>예약 무게 (LT)</span><input type="number" min="0" value={profile.reservedWeightLT ?? ''} onChange={(e) => setProfileNumber('reservedWeightLT', e.target.value)} /></label><label className="field"><span>요리 숙련도</span><input type="number" min="0" value={profile.cookingMastery ?? ''} onChange={(e) => setProfileNumber('cookingMastery', e.target.value)} /></label><label className="field"><span>연금 숙련도</span><input type="number" min="0" value={profile.alchemyMastery ?? ''} onChange={(e) => setProfileNumber('alchemyMastery', e.target.value)} /></label></div><small>숙련도는 요리·연금을 별도로 저장합니다. 확률 효과는 검증된 표의 정확한 숙련도 값에서만 계산합니다.</small></details>
      {activePlan.error && <p className="data-notice" role="alert">{activePlan.error}</p>}
      <div className="summary-card"><span>현재 목표 준비 재료</span><strong>{requestedServings?.toLocaleString() ?? '—'}회분</strong><small>{activePlan.estimatedPreparation ? '선택한 확률 준비 기준으로 계산한 추정치입니다.' : '무게/내구도 상세는 현재 선택한 목표만 표시합니다.'}</small></div>
      {skill === 'alchemy' && profile.alchemyMastery != null && <div className="summary-card"><span>연금 숙련도 산출 효과</span>{alchemyMastery ? <><strong>최대 수량 확률 {pct(alchemyMastery.maxOutputProbability)}</strong><small>일반 추가 {pct(alchemyMastery.normalExtraProbability)} · 특수 추가 {pct(alchemyMastery.specialExtraProbability)} · 희귀 추가 {pct(alchemyMastery.rareExtraProbability)}. 입력 재료 소모량이나 확정 산출량으로 환산하지 않습니다.</small></> : <><strong>검증된 숙련도 필요</strong><small>공식 표의 검증된 숙련도 값만 표시하며 중간값은 임의 보간하지 않습니다.</small></>}</div>}
      {profile.maxWeightLT != null && <div className="summary-card batch-summary"><span>현재 목표 재료 적재</span><strong>{requestedServings != null && batch?.totalStartingIngredientWeightLT != null ? `${requestedServings.toLocaleString()}회분 · ${batch.totalStartingIngredientWeightLT.toFixed(2)} LT` : batch?.maxServings != null ? `최대 ${batch.maxServings.toLocaleString()}회분` : '계산 보류'}</strong><small>{batch?.ingredientWeightPerServingLT != null ? `가용 ${batch.availableWeightLT.toLocaleString()} LT · 1회분 ${batch.ingredientWeightPerServingLT.toFixed(2)} LT · 최대 적재 ${batch.maxServings?.toLocaleString() ?? '—'}회분` : batch?.warnings[0] ?? '검증된 재료 무게가 필요합니다.'}</small>{batch?.warnings.map((warning) => <small key={warning} role="status">{warning}</small>)}{batch?.lines.length ? <ul className="carry-lines">{batch.lines.map((line) => <li key={line.itemId}><span>{dataset.items[String(line.itemId)]?.nameKo ?? `아이템 #${line.itemId}`}</span><strong>{line.countToCarry.toLocaleString()}개</strong></li>)}</ul> : null}</div>}
      <PlannerStateActions exportDisabled={sessionPlan.errors.length > 0} onReset={() => window.location.reload()} />
    </aside>
    <SessionPreparationChecklist dataset={dataset} result={sessionPlan} checked={checked} setChecked={setChecked} inventory={inventory} setInventory={setInventory} />
    </section>
  </main>
}
