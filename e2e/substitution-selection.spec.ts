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

  const substitution = page.locator('.substitution-controls select')
  await expect(substitution).toBeVisible()
  await substitution.selectOption('11')

  const row = page.locator('.material-row').filter({ hasText: '고급 재료' })
  await expect(row).toBeVisible()
  await expect(row.locator('.quantity').first()).toContainText('2')
  await expect(page.locator('.material-row').filter({ hasText: '일반 재료' })).toHaveCount(0)

  await page.reload()
  await expect(page.locator('.substitution-controls select')).toHaveValue('11')
  await expect(page.locator('.material-row').filter({ hasText: '고급 재료' })).toBeVisible()
})
