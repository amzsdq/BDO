import { parseCodexRecipeDetailHtml, collectCodexRecipeDetails } from './collect-codex-recipe-details.mjs'

function assert(condition, message) { if (!condition) throw new Error(message) }

const single = `<div class="card item_info"><div class="card-header"><a href="/kr/recipe/169/"><span class="item_title">발레노스 정식</span></a> 숙련 Lv. 6</div><table>
<tr><th>재료</th></tr><tr><td><a href="/kr/item/9203/">치즈 그라탱</a> x1</td></tr><tr><td><a href="/kr/item/9404/">미트 크로켓</a> x1</td></tr>
<tr><th>기본 제품:</th></tr><tr><td><a href="/kr/item/9601/">발레노스 정식</a> x1~4</td></tr>
<tr><th>랜덤 제품:</th></tr><tr><td><a href="/kr/item/9602/">특제 발레노스 정식</a> x1~2</td></tr>
</table></div>`
const a = parseCodexRecipeDetailHtml(single, 169, 'cooking')
assert(a.status === 'single-base' && a.outputItemId === 9601 && a.yield.min === 1 && a.yield.max === 4, 'single-base yield')
assert(a.skillText === '숙련 Lv. 6', 'skill text')
assert(a.ingredients.length === 2 && a.ingredients[0].itemId === 9203 && a.ingredients[0].count === 1, 'exact ingredients')
assert(a.randomOutputs[0].itemId === 9602 && a.randomOutputs[0].max === 2, 'random range')

const randomOnly = `<div class="card item_info"><a href="/kr/recipe/346/"><span class="item_title">예리한 수호의 정령석</span></a><table>
<tr><th>재료</th></tr><tr><td><a href="/kr/item/4481/">재료 A</a> x50</td></tr><tr><td><a href="/kr/item/16080/">재료 B</a> x5</td></tr>
<tr><th>기본 제품:</th></tr><tr><th>랜덤 제품:</th></tr><tr><td><a href="/kr/item/45340/">예리한 수호의 정령석</a> x1</td></tr>
</table></div>`
const b = parseCodexRecipeDetailHtml(randomOnly, 346, 'alchemy')
assert(b.status === 'random-only' && b.outputItemId == null && b.yield == null, 'random-only must not synthesize deterministic output')
assert(b.randomOutputs.length === 1 && b.randomOutputs[0].itemId === 45340, 'random-only output evidence')

const noOutput = `<div class="card item_info"><a href="/kr/recipe/343/"><span class="item_title">출력 미게시 연금식</span></a><table>
<tr><th>재료</th></tr><tr><td><a href="/kr/item/4481/">재료 A</a> x10</td></tr><tr><th>기본 제품:</th></tr><tr><th>랜덤 제품:</th></tr>
</table></div>`
assert(parseCodexRecipeDetailHtml(noOutput, 343, 'alchemy').status === 'no-output', 'no-output classification')


const nestedDiv = `<div class="card item_info"><div class="card-header"><a href="/kr/recipe/24/"><span class="item_title">중첩 행 테스트</span></a> 초급 Lv. 1</div>
<div class="row section">재료</div><div class="row item"><div><a href="/kr/item/100/">재료 X</a></div><span>x2</span></div>
<div class="row section">기본 제품:</div><div class="row item"><div><a href="/kr/item/200/">결과 Y</a></div><span>x1~3</span></div>
<div class="row section">랜덤 제품:</div></div>`
const nested = parseCodexRecipeDetailHtml(nestedDiv, 24, 'cooking')
assert(nested.ingredients[0].itemId === 100 && nested.ingredients[0].count === 2, 'nested div ingredient row')
assert(nested.status === 'single-base' && nested.yield.max === 3, 'nested div output row')

const unavailable = parseCodexRecipeDetailHtml('<html><body><h1>페이지를 찾을 수 없습니다</h1></body></html>', 999999, 'alchemy')
assert(unavailable.status === 'unavailable', 'explicit unavailable page classification')

let mismatch = false
try { parseCodexRecipeDetailHtml(single.replace('/recipe/169/', '/recipe/637/'), 169, 'cooking') } catch { mismatch = true }
assert(mismatch, 'recipe id mismatch must fail closed')

const catalog = { complete: true, catalogs: [{ skill: 'cooking', complete: true, recipeIds: [169] }, { skill: 'alchemy', complete: true, recipeIds: [346] }] }
const pages = new Map([[169, single], [346, randomOnly]])
const fakeFetch = async (url) => {
  const id = Number(url.match(/\/recipe\/(\d+)\//)[1])
  return { ok: true, status: 200, statusText: 'OK', url, text: async () => pages.get(id) }
}
const artifact = await collectCodexRecipeDetails(catalog, { fetchImpl: fakeFetch, concurrency: 2, retries: 0, collectedAt: '2026-09-26T00:00:00Z' })
assert(artifact.complete && artifact.exactCoverage && artifact.recipes.length === 2, 'exact catalog coverage')
assert(artifact.recipes[0].skill === 'alchemy' && artifact.recipes[1].skill === 'cooking', 'deterministic sort')
console.log('collect-codex-recipe-details regression passed')
