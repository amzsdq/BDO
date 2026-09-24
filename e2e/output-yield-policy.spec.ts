import { expect, test } from '@playwright/test'

const fixture = {
  metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
  items: {
    '940001': { id: 940001, nameKo: 'E2E 산출 요리' },
    '940002': { id: 940002, nameKo: 'E2E 산출 재료', weightLT: 0.1 },
  },
  recipes: {
    'e2e-yield-cooking': {
      id: 'e2e-yield-cooking', skill: 'cooking', outputItemId: 940001,
      yield: { min: 1, expected: 2, max: 4 },
      variants: [{ id: 'default', inputs: [{ itemId: 940002, count: 3 }] }],
    },
  },
  recipesByOutput: { '940001': ['e2e-yield-cooking'] },
}

test('output yield policy changes attempts/materials and persists across reload', async ({ page }) => {
  await page.route('**/data/dataset.json', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }))
  await page.goto('/')
  await expect(page.locator('.selected-target strong')).toHaveText('E2E 산출 요리')
  await page.getByRole('button', { name: '목표 결과물' }).click()
  await page.getByLabel('목표 결과물 수량').fill('8')

  const policy = page.getByLabel('결과물 산출 기준')
  const materialRow = page.locator('.material-row').filter({ hasText: 'E2E 산출 재료' })
  const cases = [
    { value: 'minimum', required: 24 },
    { value: 'expected', required: 12 },
    { value: 'maximum', required: 6 },
  ] as const
  for (const entry of cases) {
    await policy.selectOption(entry.value)
    await expect(materialRow.locator('.quantity').first()).toContainText(String(entry.required))
  }

  await policy.selectOption('expected')
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('bdo-planner:plan-session:v1') ?? '{}').targets?.[0]?.yieldPolicy)).toBe('expected')
  await page.reload()
  await expect(page.getByLabel('결과물 산출 기준')).toHaveValue('expected')
  await expect(materialRow.locator('.quantity').first()).toContainText('12')
})
