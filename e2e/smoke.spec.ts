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

test('keyboard search selects the first visible recipe and keeps the planner actionable', async ({ page }) => {
  await page.goto('/')

  const search = page.getByRole('combobox', { name: '제작물 검색' })
  const selectedName = (await page.locator('.selected-target strong').textContent())?.trim()
  expect(selectedName).toBeTruthy()

  // The repository intentionally falls back to its bundled sample dataset when
  // a production dataset has not been installed. Drive the real combobox using
  // the recipe that the running app actually exposes instead of assuming a
  // production-only recipe such as 맥주 is present in every CI checkout.
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
