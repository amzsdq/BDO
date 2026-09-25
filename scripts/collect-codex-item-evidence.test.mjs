import { parseCodexItemEvidenceHtml } from './collect-codex-item-evidence.mjs'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const html = `
<html><body>
<div id="outside"><span id="item_name">wrong duplicate</span></div>
<div class="item_info card">
  <div class="card-header">
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
  try { parseCodexItemEvidenceHtml('<html><body>missing card</body></html>', 6214); return false } catch { return true }
})(), 'missing item card must fail closed')
console.log('collect-codex-item-evidence fixture regression passed')
