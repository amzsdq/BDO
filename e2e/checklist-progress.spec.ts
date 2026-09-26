import { expect, test } from '@playwright/test'

const fixture = {
  metadata: { generatedAt: '2026-09-26T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
  items: { '980001': { id: 980001, nameKo: '맥주' }, '980002': { id: 980002, nameKo: '곡물' } },
  recipes: { beer: { id: 'beer', skill: 'cooking', outputItemId: 980001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 980002, count: 5 }] }] } },
  recipesByOutput: { '980001': ['beer'] },
}

test('checklist progress is visible and updates with preparation state', async ({ page }) => {
  await page.route('**/data/dataset.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }))
  await page.goto('/')
  const progress = page.locator('.checklist-progress')
  await expect(progress).toContainText('0 / 1 준비 완료')
  await expect(progress).toContainText('0%')
  await page.locator('.material-row input[type="checkbox"]').check()
  const complete = page.locator('.checklist-progress')
  await expect(complete).toContainText('1 / 1 준비 완료')
  await expect(complete).toContainText('100%')
  await expect(complete.getByRole('progressbar', { name: '준비 진행률' })).toHaveAttribute('value', '1')
})
