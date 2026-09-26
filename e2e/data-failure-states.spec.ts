import { expect, test } from '@playwright/test'

test('missing, malformed, and unverified datasets stay visibly fail-closed', async ({ page }) => {
  const datasetUrl = '**/data/dataset.json'
  await page.route(datasetUrl, (route) => route.fulfill({ status: 404, body: 'missing' }))
  await page.goto('/')
  await expect(page.getByRole('status').filter({ hasText: '샘플 모드' })).toBeVisible()
  await expect(page.locator('.status-pill')).toHaveText('KR · 검증 중')
  await page.unroute(datasetUrl)
  await page.route(datasetUrl, (route) => route.fulfill({ contentType: 'application/json', body: '{malformed' }))
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: '샘플 모드' })).toBeVisible()
  await expect(page.locator('.status-pill')).toHaveText('KR · 검증 중')
  await page.unroute(datasetUrl)
  let unverifiedRequests = 0
  await page.route(datasetUrl, (route) => { unverifiedRequests += 1; return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    metadata: { generatedAt: '2026-09-26T00:00:00Z', sources: ['E2E unverified fixture'], supportedRegion: 'KR', status: 'DRAFT' },
    items: { '950001': { id: 950001, nameKo: 'E2E 미검증 요리' }, '950002': { id: 950002, nameKo: 'E2E 미검증 재료' } },
    recipes: { unverified: { id: 'unverified', skill: 'cooking', outputItemId: 950001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 950002, count: 1 }] }] } },
    recipesByOutput: { '950001': ['unverified'] },
  }) }) })
  await page.reload()
  await expect.poll(() => unverifiedRequests).toBeGreaterThan(0)
  await expect(page.getByText('E2E 미검증 요리')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: '실데이터를 불러왔지만' })).toBeVisible()
  await expect(page.locator('.status-pill')).toHaveText('KR · 검증 중')
})
