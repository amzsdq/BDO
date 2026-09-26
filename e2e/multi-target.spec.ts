import { expect, test } from '@playwright/test'

const fixture = {
  metadata: { generatedAt: '2026-09-26T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
  items: {
    '950001': { id: 950001, nameKo: 'E2E 요리 목표' },
    '950002': { id: 950002, nameKo: 'E2E 연금 목표' },
    '950003': { id: 950003, nameKo: 'E2E 공유 재료' },
    '950004': { id: 950004, nameKo: 'E2E 공유 중간재' },
    '950005': { id: 950005, nameKo: 'E2E 중간재 원료' },
  },
  recipes: {
    cooking: { id: 'cooking', skill: 'cooking', outputItemId: 950001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 950003, count: 2 }, { itemId: 950004, count: 1 }] }] },
    alchemy: { id: 'alchemy', skill: 'alchemy', outputItemId: 950002, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 950003, count: 3 }, { itemId: 950004, count: 2 }] }] },
    intermediate: { id: 'intermediate', skill: 'cooking', outputItemId: 950004, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 950005, count: 4 }] }] },
  },
  recipesByOutput: { '950001': ['cooking'], '950002': ['alchemy'], '950004': ['intermediate'] },
}

test('multiple Cooking and Alchemy targets aggregate shared inventory once and removing one target restores totals', async ({ page }) => {
  await page.route('**/data/dataset.json', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }))
  await page.goto('/')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('1')

  await page.getByRole('button', { name: '목표 추가' }).click()
  await page.getByRole('button', { name: '연금' }).click()
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('1')

  const shared = page.locator('.material-row').filter({ hasText: 'E2E 공유 재료' })
  const intermediate = page.locator('.material-row').filter({ hasText: 'E2E 공유 중간재' })
  await expect(shared.locator('.quantity').first()).toContainText('5')
  await expect(intermediate.locator('.quantity').first()).toContainText('3')

  await page.getByLabel('E2E 공유 재료 보유 수량').fill('4')
  await page.getByLabel('E2E 공유 중간재 보유 수량').fill('2')
  await expect(shared.locator('.quantity.missing')).toContainText('1')
  await expect(intermediate.locator('.quantity.missing')).toContainText('1')

  await page.getByRole('button', { name: 'E2E 연금 목표 목표 제거' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(shared.locator('.quantity').first()).toContainText('2')
  await expect(intermediate.locator('.quantity').first()).toContainText('1')
  await expect(shared.locator('.quantity.missing')).toContainText('0')
  await expect(intermediate.locator('.quantity.missing')).toContainText('0')
})
