import { describe, expect, it, vi } from 'vitest'
import { collectCodexSubstitutionGroups, parseCodexMaterialGroupHtml } from './collect-codex-substitution-groups.mjs'

const html = `
<table><thead><tr><th>목</th><th>가치</th><th>다른 숫자</th></tr></thead><tbody>
<tr><td><a href="/kr/item/5401/">여명초</a></td><td>1</td><td>999</td></tr>
<tr><td><a href="/kr/item/7050/">고급 여명초</a></td><td>6</td><td>888</td></tr>
<tr><td><a href="/kr/item/7051/">특상품 여명초</a></td><td>36</td><td>777</td></tr>
</tbody></table>`

describe('Codex substitution evidence collector', () => {
  it('extracts canonical item ids from the explicit Worth/가치 column, not the last numeric cell', () => {
    expect(parseCodexMaterialGroupHtml(html, '3001')).toEqual([
      { itemId: 5401, value: 1 }, { itemId: 7050, value: 6 }, { itemId: 7051, value: 36 },
    ])
  })

  it('fails closed when the page shape cannot prove a material group', () => {
    expect(() => parseCodexMaterialGroupHtml('<a href="/kr/item/5401/">one</a><td>1</td>', '3001')).toThrow(/Worth\/가치 column not found/)
  })

  it('rejects contradictory duplicate rows instead of silently picking one Worth', () => {
    const conflicting = `<table><thead><tr><th>목</th><th>가치</th></tr></thead><tbody>
      <tr><td><a href="/kr/item/5401/">여명초</a></td><td>1</td></tr>
      <tr><td><a href="/kr/item/5401/">여명초</a></td><td>6</td></tr>
      <tr><td><a href="/kr/item/7050/">고급 여명초</a></td><td>6</td></tr>
    </tbody></table>`
    expect(() => parseCodexMaterialGroupHtml(conflicting, '3001')).toThrow(/conflicting Worth evidence/)
  })

  it('records the exact KR material-group source URL and collection time', async () => {
    const fetchImpl = vi.fn(async (url) => ({ ok: true, status: 200, statusText: 'OK', url, text: async () => html }))
    const result = await collectCodexSubstitutionGroups(['3001'], fetchImpl, '2026-09-23T00:00:00.000Z')
    expect(result.groups[0]).toMatchObject({ id: 'codex:3001', sourceId: '3001', sourceUrl: 'https://bdocodex.com/kr/materialgroup/3001/' })
    expect(result.groups[0].members).toHaveLength(3)
  })

  it('rejects non-numeric group ids before network access', async () => {
    const fetchImpl = vi.fn()
    await expect(collectCodexSubstitutionGroups(['../bad'], fetchImpl)).rejects.toThrow(/invalid material group id/)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
