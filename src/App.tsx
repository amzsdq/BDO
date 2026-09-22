import { useEffect, useMemo, useState } from 'react'
import { buildPlan } from './domain/planner'
import { calculateBatchCapacity } from './domain/batch'
import { forecastCookingMaterialServings } from './domain/mastery'
import { verifiedAlchemyMasteryRow } from './domain/alchemyMastery'
import { searchRecipes } from './domain/search'
import type { RecipeDataset, RecipeId } from './domain/types'
import { loadRuntimeDataset, type DatasetMode } from './data/runtime'
import { sampleDataset } from './data/sample'
import { readCharacterProfile, readChecklist, readInventory, writeCharacterProfile, writeChecklist, writeInventory } from './data/storage'

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
  const [inventory, setInventory] = useState<Record<string, number>>(() => readInventory())
  const [profile, setProfile] = useState(() => readCharacterProfile())
  useEffect(() => { void loadRuntimeDataset().then((loaded) => { setDataset(loaded.dataset); setDatasetMode(loaded.mode); setDatasetMessage(loaded.message); const first = Object.values(loaded.dataset.recipes).find((recipe) => recipe.skill === 'cooking'); if (first) setRecipeId(first.id) }) }, [])
  useEffect(() => { writeChecklist(checked) }, [checked])
  useEffect(() => { writeInventory(inventory) }, [inventory])
  useEffect(() => { writeCharacterProfile(profile) }, [profile])
  const results = useMemo(() => searchRecipes(dataset, query, { skill, limit: 8 }), [dataset, query, skill])
  const selectedRecipe = dataset.recipes[recipeId]
  const selectedItem = selectedRecipe ? dataset.items[String(selectedRecipe.outputItemId)] : undefined
  const plan = useMemo(() => selectedRecipe ? buildPlan(dataset, [{ recipeId: selectedRecipe.id, mode, amount }], { craftIntermediateItemIds: new Set(), haveByItemId: inventory }) : null, [amount, dataset, inventory, mode, selectedRecipe])
  const requestedServings = plan?.crafts[0]?.attempts
  const batch = useMemo(() => { const variant = selectedRecipe?.variants[0]; if (!variant || profile.maxWeightLT == null) return null; return calculateBatchCapacity(variant, dataset.items, { maxWeightLT: profile.maxWeightLT, reservedWeightLT: profile.reservedWeightLT }, requestedServings) }, [dataset.items, profile.maxWeightLT, profile.reservedWeightLT, requestedServings, selectedRecipe])
  const massCooking = useMemo(() => skill === 'cooking' && mode === 'attempts' && profile.cookingMastery != null ? forecastCookingMaterialServings(amount, profile.cookingMastery) ?? null : null, [amount, mode, profile.cookingMastery, skill])
  const alchemyMastery = useMemo(() => skill === 'alchemy' && profile.alchemyMastery != null ? verifiedAlchemyMasteryRow(profile.alchemyMastery) ?? null : null, [profile.alchemyMastery, skill])
  function changeSkill(next: 'cooking' | 'alchemy') { setSkill(next); setQuery(''); const first = Object.values(dataset.recipes).find((recipe) => recipe.skill === next); if (first) setRecipeId(first.id) }
  function setProfileNumber(key: 'maxWeightLT' | 'reservedWeightLT' | 'cookingMastery' | 'alchemyMastery', raw: string) { const value = raw === '' ? undefined : Math.max(0, Number(raw) || 0); setProfile((current) => ({ ...current, [key]: value })) }
  function setOwned(itemId: string, raw: string) { const value = Math.max(0, Number(raw) || 0); setInventory((current) => ({ ...current, [itemId]: value })) }
  const pct = (value: number) => `${(value * 100).toFixed(2)}%`
  return <main className="app-shell">
    <header className="hero"><div><p className="eyebrow">BLACK DESERT · 생활 준비</p><h1>요리·연금 준비를 한 화면에서</h1><p className="hero-copy">목표 수량이나 도구 사용 횟수를 입력하면 필요한 재료를 바로 계산하고, 준비한 항목을 체크하세요.</p></div><span className={`status-pill ${datasetMode}`}>{datasetMode === 'verified' ? 'KR · 검증 완료' : 'KR · 검증 중'}</span></header>
    {datasetMode !== 'verified' && <p className="data-notice" role="status">{datasetMessage}</p>}
    <section className="planner-grid"><aside className="panel controls">
      <div className="section-heading"><span>01</span><div><strong>무엇을 만들까요?</strong><small>이름을 입력하면 바로 찾습니다.</small></div></div>
      <div className="segmented skill-tabs" aria-label="생활 콘텐츠"><button className={skill === 'cooking' ? 'active' : ''} onClick={() => changeSkill('cooking')}>요리</button><button className={skill === 'alchemy' ? 'active' : ''} onClick={() => changeSkill('alchemy')}>연금</button></div>
      <div className="search-wrap"><label className="field"><span>제작물 검색</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={selectedItem?.nameKo ?? '예: 맥주'} aria-label="제작물 검색" autoComplete="off" /></label>{query.trim() && <div className="search-results" role="listbox" aria-label="검색 결과">{results.length ? results.map(({ recipe, item }) => <button key={recipe.id} role="option" aria-selected={recipe.id === recipeId} onClick={() => { setRecipeId(recipe.id); setQuery('') }}><span>{item.nameKo}</span><small>{recipe.skill === 'cooking' ? '요리' : '연금'}</small></button>) : <p>일치하는 제작물이 없습니다.</p>}</div>}</div>
      <div className="selected-target"><small>선택한 제작물</small><strong>{selectedItem?.nameKo ?? '선택 필요'}</strong></div>
      <div className="segmented" aria-label="계산 기준"><button className={mode === 'output' ? 'active' : ''} onClick={() => setMode('output')}>목표 수량</button><button className={mode === 'attempts' ? 'active' : ''} onClick={() => setMode('attempts')}>도구 사용 횟수</button></div>
      <label className="field"><span>{mode === 'output' ? '목표 수량' : '사용 횟수'}</span><input type="number" min={1} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))} /></label>
      <details className="profile-card"><summary>캐릭터 설정 · 무게/숙련도</summary><div className="profile-grid"><label className="field"><span>최대 무게 (LT)</span><input type="number" min="0" value={profile.maxWeightLT ?? ''} onChange={(e) => setProfileNumber('maxWeightLT', e.target.value)} /></label><label className="field"><span>예약 무게 (LT)</span><input type="number" min="0" value={profile.reservedWeightLT ?? ''} onChange={(e) => setProfileNumber('reservedWeightLT', e.target.value)} /></label><label className="field"><span>요리 숙련도</span><input type="number" min="0" value={profile.cookingMastery ?? ''} onChange={(e) => setProfileNumber('cookingMastery', e.target.value)} /></label><label className="field"><span>연금 숙련도</span><input type="number" min="0" value={profile.alchemyMastery ?? ''} onChange={(e) => setProfileNumber('alchemyMastery', e.target.value)} /></label></div><small>숙련도는 요리·연금을 별도로 저장합니다. 확률 효과는 검증된 표의 정확한 숙련도 값에서만 계산합니다.</small></details>
      <div className="summary-card"><span>예상 작업</span><strong>{plan?.crafts[0]?.attempts.toLocaleString() ?? '—'}회</strong><small>변동 산출량은 검증된 범위 안에서 보수적으로 계산합니다.</small></div>
      {skill === 'cooking' && mode === 'attempts' && profile.cookingMastery != null && <div className="summary-card"><span>대량 요리 반영 재료 준비</span>{massCooking ? <><strong>95% 준비 {massCooking.safe95Servings.toLocaleString()}회분</strong><small>최소 {massCooking.minimumServings.toLocaleString()} · 기대 {Math.ceil(massCooking.expectedServings).toLocaleString()} · 최대 {massCooking.maximumServings.toLocaleString()}회분 · 대량 요리 확률 {pct(massCooking.massCookingProbability)}. 95% 값은 독립 시행 모델의 확률 추정치이며 보장이 아닙니다.</small></> : <><strong>검증된 숙련도 필요</strong><small>현재 숙련도는 검증된 공식 표의 정확한 구간값이 아니므로 확률을 임의 보간하지 않습니다.</small></>}</div>}
      {skill === 'alchemy' && profile.alchemyMastery != null && <div className="summary-card"><span>연금 숙련도 산출 효과</span>{alchemyMastery ? <><strong>최대 수량 확률 {pct(alchemyMastery.maxOutputProbability)}</strong><small>일반 추가 {pct(alchemyMastery.normalExtraProbability)} · 특수 추가 {pct(alchemyMastery.specialExtraProbability)} · 희귀 추가 {pct(alchemyMastery.rareExtraProbability)}. 공식 숙련도 표의 확률 효과이며, 입력 재료 소모량이나 확정 산출량으로 환산하지 않습니다.</small></> : <><strong>검증된 숙련도 필요</strong><small>공식 표의 50 단위 숙련도(0~3000)만 표시하며 중간값은 임의 보간하지 않습니다.</small></>}</div>}
      {profile.maxWeightLT != null && <div className="summary-card batch-summary"><span>요청 작업 재료 적재</span><strong>{batch?.requestedServings != null ? `${batch.requestedServings.toLocaleString()}회분 · ${batch.requestedWeightLT?.toFixed(2) ?? '—'} LT` : batch?.maxServings != null ? `최대 ${batch.maxServings.toLocaleString()}회분` : '계산 보류'}</strong><small>{batch?.ingredientWeightPerServingLT != null ? `가용 ${batch.availableWeightLT.toLocaleString()} LT · 1회분 ${batch.ingredientWeightPerServingLT.toFixed(2)} LT · 최대 적재 ${batch.maxServings?.toLocaleString() ?? '—'}회분` : batch?.warnings[0] ?? '레시피를 선택하세요.'}</small>{batch?.warnings.map((warning) => <small key={warning} role="status">{warning}</small>)}{batch?.lines.length ? <ul className="carry-lines">{batch.lines.map((line) => <li key={line.itemId}><span>{dataset.items[String(line.itemId)]?.nameKo ?? `아이템 #${line.itemId}`}</span><strong>{line.countToCarry.toLocaleString()}개</strong></li>)}</ul> : null}</div>}
    </aside><section className="panel checklist"><div className="section-heading"><span>02</span><div><strong>준비 체크리스트</strong><small>보유 수량과 체크 상태는 이 기기에 자동 저장됩니다.</small></div></div><div className="material-list">{plan?.materials.map((material) => { const key = String(material.itemId); const item = dataset.items[key]; const done = checked[key] ?? false; const owned = inventory[key] ?? 0; return <label className={`material-row ${done ? 'done' : ''}`} key={material.itemId}><input type="checkbox" checked={done} onChange={(e) => setChecked((current) => ({ ...current, [key]: e.target.checked }))} /><div className="item-icon" aria-hidden="true">?</div><div className="material-name"><strong>{item?.nameKo ?? `아이템 #${material.itemId}`}</strong><small>{material.craftedIntermediate ? '중간재' : '재료'}</small></div><div className="quantity"><span>필요</span><strong>{material.required.toLocaleString()}</strong></div><div className="quantity owned"><span>보유</span><input aria-label={`${item?.nameKo ?? `아이템 #${material.itemId}`} 보유 수량`} type="number" min="0" value={owned} onChange={(e) => setOwned(key, e.target.value)} /></div><div className="quantity missing"><span>부족</span><strong>{material.missing.toLocaleString()}</strong></div></label> })}</div></section></section>
  </main>
}
