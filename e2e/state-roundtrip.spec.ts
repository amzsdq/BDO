import { expect, test, type Page } from '@playwright/test'

async function routeStateDataset(page: Page) {
  await page.route('**/data/dataset.json', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
      items: { '960001': { id: 960001, nameKo: 'E2E 상태 요리' }, '960002': { id: 960002, nameKo: 'E2E 상태 재료', weightLT: 0.1 } },
      recipes: { state: { id: 'state', skill: 'cooking', outputItemId: 960001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 960002, count: 2 }] }] } },
      recipesByOutput: { '960001': ['state'] },
    }) })
  })
}

async function seedPlannerState(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('7')
  await page.getByLabel('E2E 상태 재료 보유 수량').fill('3')
  await page.getByText('캐릭터 설정 · 무게/숙련도').click()
  await page.getByLabel('최대 무게 (LT)').fill('100')
}

async function expectSeededPlannerState(page: Page) {
  await expect(page.getByLabel('준비할 재료 회분')).toHaveValue('7')
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('3')
  await expect(page.getByLabel('최대 무게 (LT)')).toHaveValue('100')
}

async function exportPlanner(page: Page) {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '계획 내보내기' }).click()
  const path = await (await downloadPromise).path()
  expect(path).toBeTruthy()
  return path!
}

test('planner state survives reload, export-reset-import round trip', async ({ page }) => {
  await routeStateDataset(page)
  await seedPlannerState(page)
  await page.locator('.material-row').filter({ hasText: 'E2E 상태 재료' }).getByRole('checkbox').check()

  await page.reload()
  await expectSeededPlannerState(page)
  await expect(page.locator('.material-row').filter({ hasText: 'E2E 상태 재료' }).getByRole('checkbox')).toBeChecked()
  const exportedPath = await exportPlanner(page)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '저장 데이터 초기화' }).click()
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByLabel('준비할 재료 회분')).toHaveValue('100')
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('0')

  await page.getByLabel('계획 파일 가져오기').setInputFiles(exportedPath)
  await page.waitForLoadState('domcontentloaded')
  await expectSeededPlannerState(page)
  await expect(page.locator('.material-row').filter({ hasText: 'E2E 상태 재료' }).getByRole('checkbox')).toBeChecked()
})

test('malformed planner import reports an error and preserves current storage', async ({ page }) => {
  await routeStateDataset(page)
  await seedPlannerState(page)
  const before = await page.evaluate(() => ({ ...localStorage }))
  await page.getByLabel('계획 파일 가져오기').setInputFiles({ name: 'malformed.json', mimeType: 'application/json', buffer: Buffer.from('{not-json') })
  await expect(page.getByRole('alert')).toBeVisible()
  await expectSeededPlannerState(page)
  await expect.poll(() => page.evaluate(() => ({ ...localStorage }))).toEqual(before)
})

test('unsupported planner export version reports an error and preserves current storage', async ({ page }) => {
  await routeStateDataset(page)
  await seedPlannerState(page)
  const before = await page.evaluate(() => ({ ...localStorage }))
  await page.getByLabel('계획 파일 가져오기').setInputFiles({
    name: 'unsupported.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 999, exportedAt: '2026-09-24T00:00:00Z', checklist: {}, inventory: {}, characterProfile: {}, planSession: {} })),
  })
  await expect(page.getByRole('alert')).toContainText('지원하지 않는 플래너 내보내기 파일입니다.')
  await expectSeededPlannerState(page)
  await expect.poll(() => page.evaluate(() => ({ ...localStorage }))).toEqual(before)
})

test('planner import rolls storage back when a browser write fails mid-import', async ({ page }) => {
  await routeStateDataset(page)
  await seedPlannerState(page)
  const exportedPath = await exportPlanner(page)

  await page.getByLabel('준비할 재료 회분').fill('8')
  await page.getByLabel('E2E 상태 재료 보유 수량').fill('4')
  const before = await page.evaluate(() => ({ ...localStorage }))
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    let failed = false
    Storage.prototype.setItem = function (key: string, value: string) {
      if (!failed && key === 'bdo-planner:character-profile:v1') { failed = true; throw new Error('E2E quota') }
      return original.call(this, key, value)
    }
  })

  await page.getByLabel('계획 파일 가져오기').setInputFiles(exportedPath)
  await expect(page.getByRole('alert')).toContainText('E2E quota')
  await expect(page.getByLabel('준비할 재료 회분')).toHaveValue('8')
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('4')
  await expect.poll(() => page.evaluate(() => ({ ...localStorage }))).toEqual(before)
})
