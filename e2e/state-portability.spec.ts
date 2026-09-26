import { expect, test } from '@playwright/test'

const fixture = {
  metadata: { generatedAt: '2026-09-26T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
  items: { '960001': { id: 960001, nameKo: 'E2E 상태 요리', weightLT: 0.2 }, '960002': { id: 960002, nameKo: 'E2E 상태 재료', weightLT: 0.1 } },
  recipes: { state: { id: 'state', skill: 'cooking', outputItemId: 960001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 960002, count: 2 }] }] } },
  recipesByOutput: { '960001': ['state'] },
}

async function installFixture(page: import('@playwright/test').Page) {
  await page.route('**/data/dataset.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }))
  await page.goto('/')
}

test('reset clears complete planner state and a valid import restores it', async ({ page }) => {
  await installFixture(page)
  await page.getByLabel('E2E 상태 재료 보유 수량').fill('3')
  await page.locator('.material-row input[type="checkbox"]').check()
  await page.getByText('캐릭터 설정 · 무게/숙련도').click()
  await page.getByLabel('최대 무게 (LT)').fill('1200')
  await page.getByLabel('요리 숙련도').fill('1500')

  const exported = await page.evaluate(() => ({
    version: 2,
    exportedAt: '2026-09-26T00:00:00.000Z',
    checklist: JSON.parse(localStorage.getItem('bdo-planner:checklist:v1') ?? '{}'),
    inventory: JSON.parse(localStorage.getItem('bdo-planner:inventory:v1') ?? '{}'),
    characterProfile: JSON.parse(localStorage.getItem('bdo-planner:character-profile:v1') ?? '{}'),
    planSession: JSON.parse(localStorage.getItem('bdo-planner:plan-session:v1') ?? '{}'),
  }))
  expect(exported.inventory['960002']).toBe(3)
  expect(exported.checklist['960002']).toBe(true)
  expect(exported.characterProfile.maxWeightLT).toBe(1200)
  expect(exported.characterProfile.cookingMastery).toBe(1500)
  expect(exported.planSession.targets[0].recipeId).toBe('state')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '저장 데이터 초기화' }).click()
  await expect.poll(() => page.evaluate(() => [
    localStorage.getItem('bdo-planner:checklist:v1'),
    localStorage.getItem('bdo-planner:inventory:v1'),
    localStorage.getItem('bdo-planner:character-profile:v1'),
  ])).toEqual([null, null, null])
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('0')

  await page.getByLabel('계획 파일 가져오기').setInputFiles({
    name: 'planner-roundtrip.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  })
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('3')
  await expect(page.locator('.material-row input[type="checkbox"]')).toBeChecked()
  await page.getByText('캐릭터 설정 · 무게/숙련도').click()
  await expect(page.getByLabel('최대 무게 (LT)')).toHaveValue('1200')
  await expect(page.getByLabel('요리 숙련도')).toHaveValue('1500')
  await page.reload()
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('3')
  await expect(page.locator('.material-row input[type="checkbox"]')).toBeChecked()
})

test('unsupported import is rejected without mutating valid planner state', async ({ page }) => {
  await installFixture(page)
  await page.getByLabel('E2E 상태 재료 보유 수량').fill('7')
  await page.locator('.material-row input[type="checkbox"]').check()
  const before = await page.evaluate(() => Object.fromEntries([
    'bdo-planner:checklist:v1',
    'bdo-planner:inventory:v1',
    'bdo-planner:character-profile:v1',
    'bdo-planner:plan-session:v1',
  ].map((key) => [key, localStorage.getItem(key)])))

  await page.getByLabel('계획 파일 가져오기').setInputFiles({
    name: 'unsupported.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ version: 999, exportedAt: '2026-09-26T00:00:00.000Z' })),
  })
  await expect(page.getByRole('alert')).toContainText('지원하지 않는 플래너 내보내기 파일입니다')
  const after = await page.evaluate(() => Object.fromEntries([
    'bdo-planner:checklist:v1',
    'bdo-planner:inventory:v1',
    'bdo-planner:character-profile:v1',
    'bdo-planner:plan-session:v1',
  ].map((key) => [key, localStorage.getItem(key)])))
  expect(after).toEqual(before)
  await expect(page.getByLabel('E2E 상태 재료 보유 수량')).toHaveValue('7')
  await expect(page.locator('.material-row input[type="checkbox"]')).toBeChecked()
})
