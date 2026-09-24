import { expect, test } from '@playwright/test'

const fixture = {
  metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
  items: {
    '980001': { id: 980001, nameKo: '맥주' },
    '980002': { id: 980002, nameKo: '곡물' },
    '980003': { id: 980003, nameKo: '맥주 반죽' },
  },
  recipes: {
    beer: { id: 'beer', skill: 'cooking', outputItemId: 980001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 980002, count: 5 }] }] },
    dough: { id: 'dough', skill: 'cooking', outputItemId: 980003, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 980002, count: 2 }] }] },
  },
  recipesByOutput: { '980001': ['beer'], '980003': ['dough'] },
}

test('Korean partial search is keyboard-selectable', async ({ page }) => {
  await page.route('**/data/dataset.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }))
  await page.goto('/')
  const search = page.getByRole('combobox', { name: '제작물 검색' })
  await search.fill('반죽')
  await expect(page.getByRole('option', { name: /맥주 반죽/ })).toBeVisible()
  await search.press('Enter')
  await expect(page.locator('.selected-target strong')).toHaveText('맥주 반죽')
})

test('Korean choseong search is keyboard-selectable', async ({ page }) => {
  await page.route('**/data/dataset.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }))
  await page.goto('/')
  const search = page.getByRole('combobox', { name: '제작물 검색' })
  await search.fill('ㅁㅈ')
  const options = page.getByRole('listbox', { name: '검색 결과' }).getByRole('option')
  await expect(options.first()).toBeVisible()
  await expect(options.first()).toContainText('맥주')
  const firstId = await options.first().getAttribute('id')
  expect(firstId).toBeTruthy()
  await expect(search).toHaveAttribute('aria-activedescendant', firstId!)
  await search.press('Enter')
  await expect(page.locator('.selected-target strong')).toHaveText('맥주')
})
