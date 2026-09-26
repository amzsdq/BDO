import { expect, test } from '@playwright/test'

test('planner renders and primary controls are keyboard reachable', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '요리·연금 준비를 한 화면에서' })).toBeVisible()

  const search = page.getByRole('combobox', { name: '제작물 검색' })
  await expect(search).toBeVisible()
  await search.focus()
  await expect(search).toBeFocused()

  await expect(page.getByText(/현재 목표 준비 재료/)).toBeVisible()
  await expect(page.getByText(/준비 목록|재료/).first()).toBeVisible()
})

test('mobile layout preserves the primary planning flow without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '요리·연금 준비를 한 화면에서' })).toBeVisible()
  const search = page.getByRole('combobox', { name: '제작물 검색' })
  await expect(search).toBeVisible()
  await expect(page.getByText(/현재 목표 준비 재료/)).toBeVisible()
  await expect(page.getByText(/준비 목록|재료/).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

  const selectedName = (await page.locator('.selected-target strong').textContent())?.trim()
  expect(selectedName).toBeTruthy()
  await search.fill(selectedName!)
  await expect(page.getByRole('listbox', { name: '검색 결과' })).toBeVisible()
  await search.press('Enter')
  await expect(search).toHaveValue('')
})

test('keyboard search exposes active option semantics and escape closes results', async ({ page }) => {
  await page.goto('/')
  const search = page.getByRole('combobox', { name: '제작물 검색' })
  const selectedName = (await page.locator('.selected-target strong').textContent())?.trim()
  expect(selectedName).toBeTruthy()
  await search.fill(selectedName!)

  const options = page.getByRole('listbox', { name: '검색 결과' }).getByRole('option')
  await expect(options.first()).toBeVisible()
  await expect(search).toHaveAttribute('aria-expanded', 'true')
  const firstId = await options.first().getAttribute('id')
  expect(firstId).toBeTruthy()
  await expect(search).toHaveAttribute('aria-activedescendant', firstId!)
  await expect(options.first()).toHaveAttribute('aria-selected', 'true')

  if (await options.count() > 1) {
    await search.press('ArrowDown')
    const secondId = await options.nth(1).getAttribute('id')
    await expect(search).toHaveAttribute('aria-activedescendant', secondId!)
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')
  }

  await search.press('Escape')
  await expect(search).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('listbox', { name: '검색 결과' })).toHaveCount(0)
})

test('keyboard search selects the first visible recipe and keeps the planner actionable', async ({ page }) => {
  await page.goto('/')

  const search = page.getByRole('combobox', { name: '제작물 검색' })
  const selectedName = (await page.locator('.selected-target strong').textContent())?.trim()
  expect(selectedName).toBeTruthy()
  await search.fill(selectedName!)

  const results = page.getByRole('listbox', { name: '검색 결과' })
  await expect(results).toBeVisible()
  await expect(results.getByRole('option').first()).toBeVisible()

  await search.press('Enter')

  await expect(search).toHaveValue('')
  await expect(page.getByText('선택한 제작물 · 요리')).toBeVisible()
  await expect(page.locator('.selected-target strong')).toHaveText(selectedName!)
  await expect(page.getByText(/현재 목표 준비 재료/)).toBeVisible()
})

test('alchemy flow stays separate from Cooking mass-preparation controls', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '연금' }).click()
  await expect(page.getByText('선택한 제작물 · 연금')).toBeVisible()
  const durabilityMode = page.getByRole('button', { name: '도구 사용' })
  await durabilityMode.click()
  await expect(durabilityMode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('대량 요리 준비 기준')).toHaveCount(0)
  const profile = page.getByText('캐릭터 설정 · 무게/숙련도')
  await profile.click()
  const alchemyMastery = page.getByLabel('연금 숙련도')
  await alchemyMastery.fill('1')
  await expect(page.getByText('연금 숙련도 산출 효과')).toBeVisible()
  await expect(page.getByText('검증된 숙련도 필요')).toBeVisible()
  await expect(page.getByText(/중간값은 임의 보간하지 않습니다/)).toBeVisible()
})

test('weight profile limits the requested batch and exposes exact carry quantities', async ({ page }) => {
  let fixtureRequests = 0
  await page.route('**/data/dataset.json', async (route) => {
    fixtureRequests += 1
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
      items: { '910001': { id: 910001, nameKo: 'E2E 무게 요리' }, '910002': { id: 910002, nameKo: 'E2E 무게 재료', weightLT: 0.1 } },
      recipes: { 'e2e-weight-cooking': { id: 'e2e-weight-cooking', skill: 'cooking', outputItemId: 910001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 910002, count: 5 }] }] } },
      recipesByOutput: { '910001': ['e2e-weight-cooking'] },
    }) })
  })
  await page.goto('/')
  await expect.poll(() => fixtureRequests).toBeGreaterThan(0)
  await expect(page.locator('.selected-target strong')).toHaveText('E2E 무게 요리')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('20')
  await page.getByText('캐릭터 설정 · 무게/숙련도').click()
  await page.getByLabel('최대 무게 (LT)').fill('10')
  await page.getByLabel('예약 무게 (LT)').fill('2')
  const batchSummary = page.locator('.batch-summary')
  await expect(batchSummary).toBeVisible()
  await expect(batchSummary).toContainText('가용 8 LT')
  await expect(batchSummary).toContainText('1회분 0.50 LT')
  await expect(batchSummary).toContainText('최대 적재 16회분')
  const carryLines = batchSummary.locator('.carry-lines li')
  await expect(carryLines.first()).toBeVisible()
  await expect(carryLines.first()).toContainText('80개')
})

test('cooking durability uses source-verified mastery policies for material servings', async ({ page }) => {
  await page.route('**/data/dataset.json', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
      items: { '920001': { id: 920001, nameKo: 'E2E 숙련 요리' }, '920002': { id: 920002, nameKo: 'E2E 숙련 재료', weightLT: 0.1 } },
      recipes: { 'e2e-mastery-cooking': { id: 'e2e-mastery-cooking', skill: 'cooking', outputItemId: 920001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 920002, count: 5 }] }] } },
      recipesByOutput: { '920001': ['e2e-mastery-cooking'] },
    }) })
  })
  await page.goto('/')
  await expect(page.locator('.selected-target strong')).toHaveText('E2E 숙련 요리')
  await page.getByRole('button', { name: '도구 사용' }).click()
  await page.getByLabel('사용할 도구 내구도').fill('10')
  await page.getByText('캐릭터 설정 · 무게/숙련도').click()
  await page.getByLabel('요리 숙련도').fill('1000')
  await page.getByLabel('최대 무게 (LT)').fill('1000')
  const policy = page.getByLabel('대량 요리 준비 기준')
  const summary = page.locator('.summary-card').filter({ hasText: '현재 목표 준비 재료' })
  const batchSummary = page.locator('.batch-summary')
  const materialRow = page.locator('.material-row').filter({ hasText: 'E2E 숙련 재료' })
  const cases = [
    { value: 'minimum', servings: 10, required: 50, totalLT: '5.00' },
    { value: 'expected', servings: 41, required: 205, totalLT: '20.50' },
    { value: 'safe95', servings: 64, required: 320, totalLT: '32.00' },
    { value: 'maximum', servings: 100, required: 500, totalLT: '50.00' },
  ] as const
  for (const entry of cases) {
    await policy.selectOption(entry.value)
    await expect(summary).toContainText(`${entry.servings}회분`)
    await expect(batchSummary).toContainText(`${entry.servings}회분 · ${entry.totalLT} LT`)
    await expect(materialRow.locator('.quantity').first()).toContainText(String(entry.required))
  }
  await page.getByLabel('요리 숙련도').fill('1001')
  await expect(page.getByRole('alert').filter({ hasText: 'Cooking mastery is not a source-verified breakpoint' }).first()).toBeVisible()
})

test('craftable intermediate consumes owned stock before recursive producer expansion', async ({ page }) => {
  await page.route('**/data/dataset.json', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
      items: {
        '930001': { id: 930001, nameKo: 'E2E 완제품' }, '930002': { id: 930002, nameKo: 'E2E 중간재' },
        '930003': { id: 930003, nameKo: 'E2E 원재료 A' }, '930004': { id: 930004, nameKo: 'E2E 원재료 B' },
      },
      recipes: {
        'e2e-final': { id: 'e2e-final', skill: 'cooking', outputItemId: 930001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 930002, count: 2 }] }] },
        'e2e-intermediate-a': { id: 'e2e-intermediate-a', skill: 'cooking', outputItemId: 930002, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 930003, count: 3 }] }] },
        'e2e-intermediate-b': { id: 'e2e-intermediate-b', skill: 'cooking', outputItemId: 930002, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 930004, count: 4 }] }] },
      },
      recipesByOutput: { '930001': ['e2e-final'], '930002': ['e2e-intermediate-a', 'e2e-intermediate-b'] },
    }) })
  })
  await page.goto('/')
  await expect(page.locator('.selected-target strong')).toHaveText('E2E 완제품')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('4')
  const intermediateRow = page.locator('.material-row').filter({ hasText: 'E2E 중간재' })
  await expect(intermediateRow).toBeVisible()
  await expect(intermediateRow.locator('.quantity').first()).toContainText('8')
  await expect(page.getByText('E2E 원재료 A')).toHaveCount(0)
  await expect(page.getByText('E2E 원재료 B')).toHaveCount(0)
  await page.getByLabel('E2E 중간재 보유 수량').fill('2')
  await expect(intermediateRow.locator('.quantity.missing')).toContainText('6')
  await page.getByText('중간재 직접 제작', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'E2E 중간재 직접 제작' }).check()
  const rawARow = page.locator('.material-row').filter({ hasText: 'E2E 원재료 A' })
  await expect(rawARow).toBeVisible()
  await expect(rawARow.locator('.quantity').first()).toContainText('18')
  await page.getByLabel('제작법').selectOption('e2e-intermediate-b')
  await expect(page.locator('.material-row').filter({ hasText: 'E2E 원재료 A' })).toHaveCount(0)
  let rawBRow = page.locator('.material-row').filter({ hasText: 'E2E 원재료 B' })
  await expect(rawBRow).toBeVisible()
  await expect(rawBRow.locator('.quantity').first()).toContainText('24')

  // E2E-05 requires the craft/acquire choice and explicit producer selection to survive reload.
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'E2E 중간재 직접 제작' })).toBeChecked()
  await expect(page.getByLabel('제작법')).toHaveValue('e2e-intermediate-b')
  await expect(page.locator('.material-row').filter({ hasText: 'E2E 원재료 A' })).toHaveCount(0)
  rawBRow = page.locator('.material-row').filter({ hasText: 'E2E 원재료 B' })
  await expect(rawBRow).toBeVisible()
  await expect(rawBRow.locator('.quantity').first()).toContainText('24')

  await page.getByRole('checkbox', { name: 'E2E 중간재 직접 제작' }).uncheck()
  await expect(page.locator('.material-row').filter({ hasText: 'E2E 원재료 B' })).toHaveCount(0)
  await expect(intermediateRow).toBeVisible()
  await expect(intermediateRow.locator('.quantity.missing')).toContainText('6')
})
