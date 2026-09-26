import { expect, test } from '@playwright/test'

test('data failure states stay visibly unverified and recover when the promoted dataset returns', async ({ page }) => {
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

  const realDatasetResponse = await page.request.get('/data/dataset.json')
  expect(realDatasetResponse.ok()).toBe(true)
  const promotedDataset = await realDatasetResponse.body()
  await page.route(datasetUrl, (route) => route.fulfill({ contentType: 'application/json', body: promotedDataset }))
  await page.reload()
  await expect(page.locator('.status-pill')).toHaveText('KR · 검증 완료')
  await expect(page.getByRole('status').filter({ hasText: /샘플 모드|전체 레시피 대조 검증 전/ })).toHaveCount(0)
})
