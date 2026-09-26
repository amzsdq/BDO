import { expect, test } from '@playwright/test'

const fixture = {
  metadata: { generatedAt: '2026-09-25T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
  items: {
    '1': { id: 1, nameKo: '대체재 테스트 요리', weightLT: 0.1 },
    '10': { id: 10, nameKo: '일반 재료', weightLT: 1 },
    '11': { id: 11, nameKo: '고급 재료', weightLT: 0.5 },
  },
  recipes: {
    recipe: { id: 'recipe', skill: 'cooking', outputItemId: 1, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 10, count: 4, substitutionGroupId: 'grain' }] }] },
  },
  recipesByOutput: { '1': ['recipe'] },
  substitutionGroups: {
    grain: {
      id: 'grain',
      memberItemIds: [10, 11],
      memberValueByItemId: { '10': 1, '11': 2 },
      source: { provider: 'BDO client', sourceId: 'e2e', verifiedAt: '2026-09-25T00:00:00Z' },
    },
  },
}

test('explicit substitution selection updates the persisted preparation plan', async ({ page }) => {
  await page.route('**/data/dataset.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }))
  await page.goto('/')

  await page.getByText('캐릭터 설정 · 무게/숙련도', { exact: true }).click()
  await page.getByLabel('최대 무게 (LT)').fill('1000')

  const substitution = page.locator('.substitution-controls select')
  await expect(substitution).toBeVisible()
  await substitution.selectOption('11')

  const row = page.locator('.material-row').filter({ hasText: '고급 재료' })
  await expect(row).toBeVisible()
  await expect(row.locator('.quantity').first()).toContainText('200')
  await expect(page.locator('.material-row').filter({ hasText: '일반 재료' })).toHaveCount(0)
  await expect(page.locator('.batch-summary')).toContainText('100회분 · 100.00 LT')

  await page.reload()
  await expect(page.getByText('직접 선택: 고급 재료', { exact: false })).toBeVisible()
  await expect(page.locator('.material-row').filter({ hasText: '고급 재료' })).toBeVisible()
})
\n\ntest('large substitution groups are searchable and keyboard-selectable without rendering every member', async ({ page }) => {\n  const largeFixture = structuredClone(fixture)\n  const ids = Array.from({ length: 284 }, (_, index) => 1000 + index)\n  for (const id of ids) largeFixture.items[String(id)] = { id, nameKo: `생선 재료 ${id}`, weightLT: 0.2 }\n  largeFixture.substitutionGroups.grain.memberItemIds = [10, 11, ...ids]\n  for (const id of ids) largeFixture.substitutionGroups.grain.memberValueByItemId[String(id)] = 1\n  await page.route('**/data/dataset.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(largeFixture) }))\n  await page.goto('/')\n\n  const search = page.getByRole('combobox', { name: '일반 재료 대체 재료 검색' })\n  await expect(page.getByText('대체 재료 286종', { exact: false })).toBeVisible()\n  await search.fill('생선 재료 1283')\n  await expect(page.getByRole('option', { name: '생선 재료 1283' })).toBeVisible()\n  await search.press('ArrowDown')\n  await search.press('Enter')\n  await expect(page.getByText('직접 선택: 생선 재료 1283', { exact: false })).toBeVisible()\n})\n