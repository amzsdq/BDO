import { expect, test } from '@playwright/test'

const fixture = {
  metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
  items: {
    '970001': { id: 970001, nameKo: 'E2E 폴백 요리' },
    '970002': { id: 970002, nameKo: 'E2E 폴백 재료', iconPath: '/missing-local.png', iconUrl: '/missing-remote.png' },
  },
  recipes: {
    fallback: { id: 'fallback', skill: 'cooking', outputItemId: 970001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 970002, count: 2 }] }] },
  },
  recipesByOutput: { '970001': ['fallback'] },
}

test('item icon exhausts local and remote sources then shows placeholder', async ({ page }) => {
  await page.route('**/data/dataset.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }))
  await page.route('**/missing-local.png', (route) => route.fulfill({ status: 404 }))
  await page.route('**/missing-remote.png', (route) => route.fulfill({ status: 404 }))
  await page.goto('/')
  const row = page.locator('.material-row').filter({ hasText: 'E2E 폴백 재료' })
  await expect(row.locator('.item-icon img')).toHaveCount(0)
  await expect(row.locator('.item-icon')).toContainText('?')
})

test('dataset fetch failure enters explicit sample fallback mode instead of blank planner', async ({ page }) => {
  await page.route('**/data/dataset.json', (route) => route.fulfill({ status: 503, body: 'unavailable' }))
  await page.goto('/')
  await expect(page.getByRole('status')).toContainText('샘플 모드')
  await expect(page.locator('.status-pill')).toContainText('검증 중')
  await expect(page.getByRole('heading', { name: '요리·연금 준비를 한 화면에서' })).toBeVisible()
})
