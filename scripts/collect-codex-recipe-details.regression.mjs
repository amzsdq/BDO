import { parseCodexRecipeDetailHtml, collectCodexRecipeDetails } from './collect-codex-recipe-details.mjs'
import { applyRetiredRouteStateToDetails } from './reviewed-retired-route-state.mjs'

function assert(condition, message) { if (!condition) throw new Error(message) }

const single = `<div class="card item_info"><div class="card-header"><a href="/kr/recipe/169/"><span class="item_title">발레노스 정식</span></a> 요리 스킬 레벨: 숙련 Lv. 6</div><table>
<tr><th>재료</th></tr><tr><td><a href="/kr/item/9203/">치즈 그라탱</a> x1</td></tr><tr><td><a href="/kr/item/9404/">미트 크로켓</a> x1</td></tr>
<tr><th>기본 제품:</th></tr><tr><td><a href="/kr/item/9601/">발레노스 정식</a> x1~4</td></tr>
<tr><th>랜덤 제품:</th></tr><tr><td><a href="/kr/item/9602/">특제 발레노스 정식</a> x1~2</td></tr>
</table></div>`
const a = parseCodexRecipeDetailHtml(single, 169, 'cooking')
assert(a.status === 'single-base' && a.outputItemId === 9601 && a.yield.min === 1 && a.yield.max === 4, 'single-base yield')
assert(a.skillText === '숙련 Lv. 6', 'skill text')
assert(a.ingredients.length === 2 && a.ingredients[0].itemId === 9203 && a.ingredients[0].count === 1, 'exact ingredients')
assert(a.randomOutputs[0].itemId === 9602 && a.randomOutputs[0].max === 2, 'random range')


const liveRowShape = `<div class="card item_info"><div class="card-header">ID: 54<div class="item_title" id="item_name"><b>광대의 혈액</b></div></div>
<div class="card-body"><table><tr><td>레시피<br><span class="yellow_text">연금</span><br>스킬 레벨: 견습 Lv. 1</td></tr>
<tr><td><span class="yellow_text">- 제작 재료</span><br>
<div class="iconset_wrapper_medium inlinediv"><a href="/kr/item/5006/"><div class="quantity_small nowrap">1</div></a></div> - <a href="/kr/item/5006/">정령의 잎사귀</a><br>
<div class="iconset_wrapper_medium inlinediv"><a href="/kr/item/4801/"><div class="quantity_small nowrap">1</div></a></div> - <a href="/kr/item/4801/">어둠의 가루</a><br>
<div class="iconset_wrapper_medium inlinediv"><a href="/kr/item/5301/"><div class="quantity_small nowrap">1</div></a></div> - <a href="/kr/item/5301/">맑은 액체 시약</a><br>
<div class="iconset_wrapper_medium inlinediv"><a href="/kr/item/6214/"><div class="quantity_small nowrap">2</div></a></div> - <a href="/kr/item/6214/">늑대 피</a></td></tr>
<tr><td><span class="yellow_text">- 제작 결과</span><br>기본 제품:<br>
<div class="iconset_wrapper_medium inlinediv"><a href="/kr/item/6353/"><div class="quantity_small nowrap">1~4</div></a></div> - <a href="/kr/item/6353/">광대의 혈액</a>
<br>추가 (무작위) 제품:<br>
<div class="iconset_wrapper_medium inlinediv"><a href="/kr/item/9733/"><div class="quantity_small nowrap">1</div></a></div> - <a href="/kr/item/9733/">빛나는 가루</a></td></tr>
<tr><td>참고</td></tr></table></div></div>`
const liveRowParsed = parseCodexRecipeDetailHtml(liveRowShape, 54, 'alchemy')
assert(liveRowParsed.ingredients.length === 4 && liveRowParsed.ingredients.map((row) => row.count).join(',') === '1,1,1,2', 'live Codex section row parses every ingredient')
assert(liveRowParsed.status === 'single-base' && liveRowParsed.outputItemId === 6353 && liveRowParsed.yield.min === 1 && liveRowParsed.yield.max === 4, 'live Codex section row parses base output range')
assert(liveRowParsed.randomOutputs.length === 1 && liveRowParsed.randomOutputs[0].itemId === 9733, 'live Codex section row separates random output from base output')

const randomOnly = `<div class="card item_info"><a href="/kr/recipe/346/"><span class="item_title">예리한 수호의 정령석</span></a> 연금 스킬 레벨: 숙련 Lv. 1<table>
<tr><th>재료</th></tr><tr><td>50 - <a href="/kr/item/4481/">재료 A</a></td></tr><tr><td>5 - <a href="/kr/item/16080/">재료 B</a></td></tr>
<tr><th>기본 제품:</th></tr><tr><th>추가 (무작위) 제품:</th></tr><tr><td>1 - <a href="/kr/item/45340/">예리한 수호의 정령석</a></td></tr>
</table></div>`
const b = parseCodexRecipeDetailHtml(randomOnly, 346, 'alchemy')
assert(b.status === 'random-only' && b.outputItemId == null && b.yield == null, 'random-only must not synthesize deterministic output')
assert(b.randomOutputs.length === 1 && b.randomOutputs[0].itemId === 45340, 'random-only output evidence')

const noOutput = `<div class="card item_info"><a href="/kr/recipe/343/"><span class="item_title">출력 미게시 연금식</span></a> 연금 스킬 레벨: 숙련 Lv. 1<table>
<tr><th>재료</th></tr><tr><td><a href="/kr/item/4481/">재료 A</a> x10</td></tr><tr><th>기본 제품:</th></tr><tr><th>랜덤 제품:</th></tr>
</table></div>`
assert(parseCodexRecipeDetailHtml(noOutput, 343, 'alchemy').status === 'no-output', 'no-output classification')

const partialNoOutput = `<div class="card item_info"><a href="/kr/recipe/344/"><span class="item_title">부분 게시 연금식</span></a> 연금 스킬 레벨: 숙련 Lv. 1<table>
<tr><th>재료</th></tr><tr><td><a href="/kr/item/4917/">평온의 오일</a> x10</td></tr><tr><td>x4</td></tr><tr><td>4 - </td></tr>
<tr><th>기본 제품:</th></tr><tr><th>랜덤 제품:</th></tr></table></div>`
let partialRejected = false
try { parseCodexRecipeDetailHtml(partialNoOutput, 344, 'alchemy') } catch (error) { partialRejected = /quantified row without an exact item identity/.test(error.message) }
assert(partialRejected, 'partial ingredient rows must fail closed instead of producing an incomplete no-output signature')

const calculatorPartialNoOutput = `<html><body><div class="card item_info"><a href="/kr/recipe/344/"><span class="item_title">부분 게시 연금식</span></a> 연금 스킬 레벨: 숙련 Lv. 1<table>
<tr><th>재료</th></tr><tr><td><a href="/kr/item/4917/">평온의 오일</a> x10</td></tr><tr><th>기본 제품:</th></tr><tr><th>랜덤 제품:</th></tr></table></div>
<section>기술 계산기 <div>10 x 평온의 오일</div><div>4 x <input></div><div>4 x <input></div></section><div>댓글을 남기려면 로그인</div></body></html>`
let calculatorPartialRejected = false
try { parseCodexRecipeDetailHtml(calculatorPartialNoOutput, 344, 'alchemy') } catch (error) { calculatorPartialRejected = /skill calculator exposes 3 quantified ingredient rows but only 1 exact ingredient identities/.test(error.message) }
assert(calculatorPartialRejected, 'no-output calculator quantities must expose partial ingredient evidence outside item_info card')

const calculatorCompleteNoOutput = noOutput.replace('</div>', '</div><section>기술 계산기 <div>10 x 재료 A</div></section><div>댓글을 남기려면 로그인</div>')
assert(parseCodexRecipeDetailHtml(calculatorCompleteNoOutput, 343, 'alchemy').status === 'no-output', 'matching calculator quantity count preserves complete no-output evidence')
const calculatorWithNumericComment = calculatorCompleteNoOutput.replace('댓글을 남기려면 로그인', '정렬 기준: 평가 <div>사용자 댓글: 99 x 라고 적음</div> 댓글을 남기려면 로그인')
assert(parseCodexRecipeDetailHtml(calculatorWithNumericComment, 343, 'alchemy').status === 'no-output', 'calculator cross-check must stop before user comments containing quantity-like text')

const calculatorAnonymousOutput = `<html><body><div class="card item_info"><a href="/kr/recipe/221/"><span class="item_title">가고일 다리살 조림</span></a> 요리 스킬 레벨: 숙련 Lv. 1<table>
<tr><th>재료</th></tr><tr><td><a href="/kr/item/9001/">이국의 곡주</a> x2</td></tr><tr><td><a href="/kr/item/9002/">양파</a> x3</td></tr><tr><td><a href="/kr/item/9003/">마늘</a> x3</td></tr><tr><td><a href="/kr/item/9004/">식초</a> x2</td></tr>
<tr><th>기본 제품:</th></tr><tr><th>랜덤 제품:</th></tr></table></div>
<section>기술 계산기 <div>1 x <input></div><div>2 x 이국의 곡주</div><div>3 x 양파</div><div>3 x 마늘</div><div>2 x 식초</div></section><div>댓글을 남기려면 로그인</div></body></html>`
assert(parseCodexRecipeDetailHtml(calculatorAnonymousOutput, 221, 'cooking').status === 'no-output', 'anonymous calculator output quantity before the first exact ingredient must not be counted as an ingredient row')


const nestedDiv = `<div class="card item_info"><div class="card-header"><a href="/kr/recipe/24/"><span class="item_title">중첩 행 테스트</span></a> 요리 스킬 레벨: 초급 Lv. 1</div>
<div class="row section">재료</div><div class="row item"><div><a href="/kr/item/100/">재료 X</a></div><span>x2</span></div>
<div class="row section">기본 제품:</div><div class="row item"><div><a href="/kr/item/200/">결과 Y</a></div><span>x1~3</span></div>
<div class="row section">랜덤 제품:</div></div>`
const nested = parseCodexRecipeDetailHtml(nestedDiv, 24, 'cooking')
assert(nested.ingredients[0].itemId === 100 && nested.ingredients[0].count === 2, 'nested div ingredient row')
assert(nested.status === 'single-base' && nested.yield.max === 3, 'nested div output row')

const unavailable = parseCodexRecipeDetailHtml('<html><body><h1>페이지를 찾을 수 없습니다</h1></body></html>', 999999, 'alchemy')
assert(unavailable.status === 'unavailable', 'explicit unavailable page classification')

const disabled = `<div class="card item_info"><a href="/kr/recipe/340/"><span class="item_title">비활성 연금식</span></a> 연금 스킬 레벨: 숙련 Lv. 1<div>이 레시피는 게임에서 사용할 수 없습니다!</div><table>
<tr><th>재료</th></tr><tr><td><a href="/kr/item/4481/">재료 A</a> x1</td></tr>
<tr><th>기본 제품:</th></tr><tr><td><a href="/kr/item/999/">오래된 결과</a> x1</td></tr><tr><th>랜덤 제품:</th></tr><tr><td><a href="/kr/item/998/">오래된 랜덤 결과</a> x1</td></tr>
</table></div>`
const disabledParsed = parseCodexRecipeDetailHtml(disabled, 340, 'alchemy')
assert(disabledParsed.status === 'unavailable' && disabledParsed.baseOutputs.length === 0 && disabledParsed.randomOutputs.length === 0, 'scoped disabled marker must override stale output rows')

const harmlessNotFound = single.replace('요리 스킬 레벨:', '<span>not found</span> 요리 스킬 레벨:')
assert(parseCodexRecipeDetailHtml(harmlessNotFound, 169, 'cooking').status === 'single-base', 'generic not found text outside a missing-page marker must not disable a valid card')

const harmlessKoreanMissingText = single.replace('요리 스킬 레벨:', '<span>페이지를 찾을 수 없습니다</span> 요리 스킬 레벨:')
assert(parseCodexRecipeDetailHtml(harmlessKoreanMissingText, 169, 'cooking').status === 'single-base', 'missing-page prose must not override a valid identified recipe card')

let mismatch = false
try { parseCodexRecipeDetailHtml(single.replace('/recipe/169/', '/recipe/637/'), 169, 'cooking') } catch { mismatch = true }
assert(mismatch, 'recipe id mismatch must fail closed')

let skillMismatch = false
try { parseCodexRecipeDetailHtml(single, 169, 'alchemy') } catch { skillMismatch = true }
assert(skillMismatch, 'catalog/page skill mismatch must fail closed')

const catalog = { complete: true, catalogs: [{ skill: 'cooking', complete: true, recipeIds: [169] }, { skill: 'alchemy', complete: true, recipeIds: [346] }] }
const pages = new Map([[169, single], [346, randomOnly]])
const fakeFetch = async (url) => {
  const id = Number(url.match(/\/recipe\/(\d+)\//)[1])
  return { ok: true, status: 200, statusText: 'OK', url, text: async () => pages.get(id) }
}
const artifact = await collectCodexRecipeDetails(catalog, { fetchImpl: fakeFetch, concurrency: 2, retries: 0, collectedAt: '2026-09-26T00:00:00Z' })
assert(artifact.complete && artifact.exactCoverage && artifact.recipes.length === 2, 'exact catalog coverage')
assert(artifact.recipes[0].skill === 'alchemy' && artifact.recipes[1].skill === 'cooking', 'deterministic sort')

const cookingPage = (id) => single.replaceAll('/recipe/169/', `/recipe/${id}/`)
const gapCatalog = { complete: true, catalogs: [{ skill: 'cooking', complete: true, recipeIds: [1, 3] }] }
const gapFetch = async (url) => {
  const id = Number(url.match(/\/recipe\/(\d+)\//)[1])
  if (id === 2) return { ok: true, status: 200, statusText: 'OK', url, text: async () => disabled.replaceAll('/recipe/340/', '/recipe/2/') }
  if (id === 1 || id === 3) return { ok: true, status: 200, statusText: 'OK', url, text: async () => cookingPage(id) }
  return { ok: false, status: 404, statusText: 'Not Found', url, text: async () => '' }
}
const gapArtifact = await collectCodexRecipeDetails(gapCatalog, { fetchImpl: gapFetch, retries: 0, probeGaps: true, collectedAt: '2026-09-26T00:00:00Z' })
assert(gapArtifact.complete && gapArtifact.exactCoverage, 'catalog-listed subset remains exact under supplemental discovery')
assert(gapArtifact.catalogRouteCount === 2 && gapArtifact.supplementalRouteCount === 1, 'gap route is supplemental, not catalog coverage')
assert(gapArtifact.supplementalDiscovery.method === 'catalog-gap-probe' && gapArtifact.supplementalDiscovery.complete && gapArtifact.supplementalDiscovery.probedGapCount === 1, 'supplemental discovery coverage is explicit')
assert(gapArtifact.supplementalDiscovery.probedMinRecipeId === 1 && gapArtifact.supplementalDiscovery.probedMaxRecipeId === 3 && gapArtifact.supplementalDiscovery.boundedByCatalogHighWater === true, 'supplemental completeness is explicitly bounded by catalog high-water')
const supplemental = gapArtifact.recipes.find((row) => row.recipeId === 2)
assert(supplemental && supplemental.catalogListed === false && supplemental.discovery === 'catalog-gap-probe', 'supplemental route preserves discovery provenance')
assert(supplemental.status === 'unavailable' && supplemental.skill === 'alchemy', 'disabled supplemental route is preserved as unavailable evidence')
assert(gapArtifact.recipes.filter((row) => row.catalogListed).length === 2, 'catalog accounting excludes supplemental route')


const emptyCodexShell = `<!DOCTYPE html><html lang="ko"><head><title> - BDO Codex</title><meta property="og:title" content=" - BDO Codex"></head><body><nav>데이터 베이스</nav></body></html>`
const emptyShellFetch = async (url) => {
  const id = Number(url.match(/\/recipe\/(\d+)\//)[1])
  if (id === 2) return { ok: true, status: 200, statusText: 'OK', url, text: async () => emptyCodexShell }
  if (id === 1 || id === 3) return { ok: true, status: 200, statusText: 'OK', url, text: async () => cookingPage(id) }
  return { ok: false, status: 404, statusText: 'Not Found', url, text: async () => '' }
}
const emptyShellArtifact = await collectCodexRecipeDetails(gapCatalog, { fetchImpl: emptyShellFetch, retries: 0, probeGaps: true, collectedAt: '2026-09-26T00:00:00Z' })
assert(emptyShellArtifact.complete && emptyShellArtifact.unresolvedCount === 0, 'BDO Codex HTTP-200 empty entity shell is an expected absent supplemental id')
assert(emptyShellArtifact.supplementalRouteCount === 0 && !emptyShellArtifact.recipes.some((row) => row.recipeId === 2), 'empty supplemental shell does not fabricate a route identity')


const guildCraftPage = `<div class="card item_info"><div class="card-header">ID: 2</div><div class="card-body"><table>
<tr><td>레시피<br><span class="yellow_text">길드 공작</span><br><span>스킬 레벨: 초급 Lv.</span></td></tr>
<tr><td><span class="yellow_text">- 제작 재료</span><br><div class="iconset_wrapper_medium"><a href="/kr/item/100/"><div class="quantity_small">2</div></a></div> - <a href="/kr/item/100/">재료</a></td></tr>
</table></div></div>`
const guildGapFetch = async (url) => {
  const id = Number(url.match(/\/recipe\/(\d+)\//)[1])
  if (id === 2) return { ok: true, status: 200, statusText: 'OK', url, text: async () => guildCraftPage }
  if (id === 1 || id === 3) return { ok: true, status: 200, statusText: 'OK', url, text: async () => cookingPage(id) }
  return { ok: false, status: 404, statusText: 'Not Found', url, text: async () => '' }
}
const guildGapArtifact = await collectCodexRecipeDetails(gapCatalog, { fetchImpl: guildGapFetch, retries: 0, probeGaps: true, collectedAt: '2026-09-26T00:00:00Z' })
assert(guildGapArtifact.complete && guildGapArtifact.unresolvedCount === 0, 'identified non Cooking-Alchemy supplemental route does not block target-skill completeness')
assert(guildGapArtifact.supplementalRouteCount === 0 && guildGapArtifact.supplementalDiscovery.nonTargetRecipeIds.join(',') === '2', 'non-target supplemental identity is explicitly accounted without entering planner routes')


const identifiedIncompleteAlchemy = `<div class="card item_info"><a href="/kr/recipe/2/"><span class="item_title">과거 연금식</span></a> 연금 스킬 레벨: 숙련 Lv. 1<table>
<tr><th>재료</th></tr><tr><th>기본 제품:</th></tr><tr><th>랜덤 제품:</th></tr></table></div>`
const identifiedGapFetch = async (url) => {
  const id = Number(url.match(/\/recipe\/(\d+)\//)[1])
  if (id === 2) return { ok: true, status: 200, statusText: 'OK', url, text: async () => identifiedIncompleteAlchemy }
  if (id === 1 || id === 3) return { ok: true, status: 200, statusText: 'OK', url, text: async () => cookingPage(id) }
  return { ok: false, status: 404, statusText: 'Not Found', url, text: async () => '' }
}
const identifiedGap = await collectCodexRecipeDetails(gapCatalog, { fetchImpl: identifiedGapFetch, retries: 0, probeGaps: true, collectedAt: '2026-09-26T00:00:00Z' })
const identifiedSupplemental = identifiedGap.recipes.find((row) => row.recipeId === 2)
assert(!identifiedGap.complete && identifiedGap.unresolvedCount === 1, 'identified-but-incomplete supplemental route remains unresolved before review')
assert(identifiedSupplemental?.skill === 'alchemy' && /no exact ingredients parsed/.test(identifiedSupplemental.error || ''), 'supplemental failure preserves exact skill identity')
const reviewedGap = applyRetiredRouteStateToDetails(identifiedGap, {
  schemaVersion: 1,
  scope: 'kr-pc-crafting-route-live-state',
  reviewedAt: '2026-09-26',
  source: { url: 'https://www.kr.playblackdesert.com/ko-KR/News/Detail?groupContentNo=16141', effectiveDate: '2026-09-02' },
  routes: [{ recipeId: 2, skill: 'alchemy', status: 'retired' }],
  retiredCraftingOutputItemIds: [999001],
  retiredCraftingIngredientItemIds: [999002],
})
const reviewedSupplemental = reviewedGap.recipes.find((row) => row.recipeId === 2)
assert(reviewedGap.complete && reviewedGap.unresolvedCount === 0, 'reviewed retired route resolves an identity-established supplemental parse failure')
assert(reviewedSupplemental?.status === 'unavailable' && reviewedSupplemental.liveState === 'retired-reviewed' && reviewedSupplemental.skill === 'alchemy', 'reviewed route keeps exact supplemental identity')

const malformedIdentifiedAlchemy = identifiedIncompleteAlchemy.replace('<tr><th>기본 제품:</th>', '<tr><td>x4</td></tr><tr><th>기본 제품:</th>')
const malformedIdentityFetch = async (url) => {
  const id = Number(url.match(/\/recipe\/(\d+)\//)[1])
  if (id === 2) return { ok: true, status: 200, statusText: 'OK', url, text: async () => malformedIdentifiedAlchemy }
  return { ok: true, status: 200, statusText: 'OK', url, text: async () => cookingPage(id) }
}
const malformedIdentityArtifact = await collectCodexRecipeDetails(gapCatalog, { fetchImpl: malformedIdentityFetch, retries: 0, probeGaps: true, concurrency: 1, collectedAt: '2026-09-26T00:00:00Z' })
const malformedIdentityRow = malformedIdentityArtifact.recipes.find((row) => row.recipeId === 2)
assert(malformedIdentityRow?.status === 'unresolved' && malformedIdentityRow.skill === 'alchemy', 'post-identity supplemental parse failure preserves observed alchemy skill')

let terminalCalls = 0
const terminalFetch = async () => {
  terminalCalls += 1
  return { ok: false, status: 404, statusText: 'Not Found', url: 'https://bdocodex.com/kr/recipe/169/', text: async () => '' }
}
const terminalArtifact = await collectCodexRecipeDetails(
  { complete: true, catalogs: [{ skill: 'cooking', complete: true, recipeIds: [169] }] },
  { fetchImpl: terminalFetch, retries: 3, collectedAt: '2026-09-26T00:00:00Z' },
)
assert(terminalCalls === 1, 'terminal 4xx must not retry')
assert(!terminalArtifact.complete && terminalArtifact.unresolvedCount === 1, 'terminal 4xx remains fail-closed unresolved')
console.log('collect-codex-recipe-details regression passed')
