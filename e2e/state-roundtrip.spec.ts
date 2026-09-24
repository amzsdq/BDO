import { expect, test } from '@playwright/test'

async function routeStateDataset(page: Parameters<typeof test>[0] extends never ? never : any) {
  await page.route('**/data/dataset.json', async (route: any) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
      items: { '960001': { id: 960001, nameKo: 'E2E 상태 요리' }, '960002': { id: 960002, nameKo: 'E2E 상태 재료', weightLT: 0.1 } },
      recipes: { state: { id: 'state', skill: 'cooking', outputItemId: 960001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 960002, count: 2 }] }] } },
      recipesByOutput: { '960001': ['state'] },
    }) })
  })
}

test('planner state survives reload, export-reset-import round trip', async ({ page }) => {
  await routeStateDataset(page)

  await page.goto('/')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('7')
  await page.getByLabel('E2E 상태 재료 보유 수량').fill('3')
  await page.getByText('캐릭터 설정 · 무게/숙련도').click()
  await page.getByLabel('최대 무게 (LT)').fill('100')
  await page.locator('.material-row').filter({ hasText: 'E2E 상태 재료' }).getByRole('checkbox').check()

  await page.reload()
  await expect(page.getByLabel('준비할 재료 회분')).toHaveValue('7')
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('3')
  await expect(page.getByLabel('최대 무게 (LT)')).toHaveValue('100')
  await expect(page.locator('.material-row').filter({ hasText: 'E2E 상태 재료' }).getByRole('checkbox')).toBeChecked()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '계획 내보내기' }).click()
  const download = await downloadPromise
  const exportedPath = await download.path()
  expect(exportedPath).toBeTruthy()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '저장 데이터 초기화' }).click()
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByLabel('준비할 재료 회분')).toHaveValue('100')
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('0')

  await page.getByLabel('계획 파일 가져오기').setInputFiles(exportedPath!)
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByLabel('준비할 재료 회분')).toHaveValue('7')
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('3')
  await expect(page.getByLabel('최대 무게 (LT)')).toHaveValue('100')
  await expect(page.locator('.material-row').filter({ hasText: 'E2E 상태 재료' }).getByRole('checkbox')).toBeChecked()
})

test('malformed planner import reports an error and preserves current storage', async ({ page }) => {
  await routeStateDataset(page)
  await page.goto('/')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('7')
  await page.getByLabel('E2E 상태 재료 보유 수량').fill('3')
  await page.getByText('캐릭터 설정 · 무게/숙련도').click()
  await page.getByLabel('최대 무게 (LT)').fill('100')

  const before = await page.evaluate(() => ({ ...localStorage }))
  await page.getByLabel('계획 파일 가져오기').setInputFiles({
    name: 'malformed.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not-json'),
  })

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('준비할 재료 회분')).toHaveValue('7')
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('3')
  await expect(page.getByLabel('최대 무게 (LT)')).toHaveValue('100')
  await expect.poll(() => page.evaluate(() => ({ ...localStorage }))).toEqual(before)
})
