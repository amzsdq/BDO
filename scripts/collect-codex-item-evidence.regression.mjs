import { collectCodexItemEvidence, parseCodexItemEvidenceHtml } from './collect-codex-item-evidence.mjs'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const html = `
<html><body>
<div id="outside"><span id="item_name">wrong duplicate</span></div>
<div class="item_info card">
  <div class="card-header">ID: 6214
    <div><span id="item_name" class="rarity item_title"><b>테스트 아이템</b></span></div>
  </div>
  <div class="card-body">
    <div class="nested"><div>무 게: 0.10 LT</div></div>
    <a href="/kr/item/6214/">self</a>
    <div><a href="/kr/materialgroup/6503/">group</a></div>
    <p>연금 숙련도 500 이상</p>
  </div>
</div>
<div><a href="/kr/materialgroup/9999/">outside group</a></div>
</body></html>`

const row = parseCodexItemEvidenceHtml(html, 6214)
assert(row.itemId === 6214, 'item id')
assert(row.nameKo === '테스트 아이템', 'Korean card title')
assert(row.weightLT === 0.10, 'weight')
assert(JSON.stringify(row.materialGroupIds) === JSON.stringify(['6503']), 'material group scope')
assert(row.masteryRequirement?.skill === 'alchemy' && row.masteryRequirement.minimumMastery === 500, 'mastery')
assert((() => {
  try { parseCodexItemEvidenceHtml(html, 9999); return false } catch { return true }
})(), 'card item id mismatch must fail closed')
assert((() => {
  try { parseCodexItemEvidenceHtml('<html><body>missing card</body></html>', 6214); return false } catch { return true }
})(), 'missing item card must fail closed')
const htmlFor = (id) => html.replace('ID: 6214', `ID: ${id}`)
const calls = new Map()
const fakeFetch = async (url) => {
  const id = Number(url.match(/\/(\d+)\/$/)[1]); calls.set(id, (calls.get(id) || 0) + 1)
  if (id === 700 && calls.get(id) === 1) return { ok: false, status: 503, statusText: 'retry', url }
  return { ok: true, status: 200, statusText: 'OK', url, text: async () => htmlFor(id) }
}
const collected = await collectCodexItemEvidence([701, 700, 701], fakeFetch, '2026-09-25T00:00:00Z', { concurrency: 2, timeoutMs: 1000, retries: 1 })
assert(JSON.stringify(collected.items.map((entry) => entry.itemId)) === JSON.stringify([700, 701]), 'deduplicated deterministic sort')
assert(calls.get(700) === 2 && calls.get(701) === 1, 'bounded transient retry')
let terminalCalls = 0
try { await collectCodexItemEvidence([702], async (url) => { terminalCalls += 1; return { ok: false, status: 404, statusText: 'missing', url } }, '2026-09-25T00:00:00Z', { retries: 3, timeoutMs: 1000 }); throw new Error('404 accepted') } catch (error) { assert(String(error.message).includes('404'), 'terminal 404 error') }
assert(terminalCalls === 1, 'terminal 4xx must not retry')
console.log('collect-codex-item-evidence fixture regression passed')
