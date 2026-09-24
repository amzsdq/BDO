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

test('keyboard search selects a recipe and keeps the planner actionable', async ({ page }) => {
  await page.goto('/')

  const search = page.getByRole('combobox', { name: '제작물 검색' })
  await search.fill('맥주')

  const results = page.getByRole('listbox', { name: '검색 결과' })
  await expect(results).toBeVisible()
  await expect(results.getByRole('option').first()).toBeVisible()

  await search.press('Enter')

  await expect(search).toHaveValue('')
  await expect(page.getByText('선택한 제작물 · 요리')).toBeVisible()
  await expect(page.getByText('맥주', { exact: true }).first()).toBeVisible()
  await expect(page.getByText(/현재 목표 준비 재료/)).toBeVisible()
})
