import { parseCodexRecipeDetailHtml, collectCodexRecipeDetails } from './collect-codex-recipe-details.mjs'

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

const malformedGap = noOutput.replaceAll('/recipe/343/', '/recipe/2/').replace('<tr><th>기본 제품:</th>', '<tr><td>x4</td></tr><tr><th>기본 제품:</th>')
const preserveFetch = async (url) => {
  const id = Number(url.match(/\\/recipe\\/(\\d+)\\//)[1])
  if (id === 2) return { ok: true, status: 200, statusText: 'OK', url, text: async () => malformedGap }
  return { ok: true, status: 200, statusText: 'OK', url, text: async () => cookingPage(id) }
}
const preserveArtifact = await collectCodexRecipeDetails(gapCatalog, { fetchImpl: preserveFetch, retries: 0, probeGaps: true, concurrency: 1, collectedAt: '2026-09-26T00:00:00Z' })
const preserveRow = preserveArtifact.recipes.find((row) => row.recipeId === 2)
assert(preserveRow?.status === 'unresolved' && preserveRow.skill === 'alchemy', 'identified supplemental parse failure preserves observed skill')

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
