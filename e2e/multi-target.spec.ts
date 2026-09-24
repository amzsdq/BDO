import { expect, test } from '@playwright/test'

test('multiple Cooking and Alchemy targets aggregate shared inventory once', async ({ page }) => {
  await page.route('**/data/dataset.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
        items: {
          '940001': { id: 940001, nameKo: 'E2E 요리 완제품' },
          '940002': { id: 940002, nameKo: 'E2E 연금 완제품' },
          '940003': { id: 940003, nameKo: 'E2E 공유 재료' },
          '940004': { id: 940004, nameKo: 'E2E 공유 중간재' },
          '940005': { id: 940005, nameKo: 'E2E 중간재 원료' },
        },
        recipes: {
          cooking: { id: 'cooking', skill: 'cooking', outputItemId: 940001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 940003, count: 2 }, { itemId: 940004, count: 1 }] }] },
          alchemy: { id: 'alchemy', skill: 'alchemy', outputItemId: 940002, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 940003, count: 3 }, { itemId: 940004, count: 1 }] }] },
          intermediate: { id: 'intermediate', skill: 'cooking', outputItemId: 940004, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 940005, count: 2 }] }] },
        },
        recipesByOutput: { '940001': ['cooking'], '940002': ['alchemy'], '940004': ['intermediate'] },
      }),
    })
  })

  await page.goto('/')
  await expect(page.locator('.selected-target strong')).toHaveText('E2E 요리 완제품')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('2')
  await page.getByText('중간재 직접 제작', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'E2E 공유 중간재 직접 제작' }).check()

  await page.getByLabel('E2E 공유 재료 보유 수량').fill('4')
  await page.getByLabel('E2E 공유 중간재 보유 수량').fill('1')

  await page.getByRole('button', { name: '목표 추가' }).click()
  await page.getByRole('button', { name: '연금' }).click()
  await expect(page.locator('.selected-target strong')).toHaveText('E2E 연금 완제품')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('2')

  const shared = page.locator('.material-row').filter({ hasText: 'E2E 공유 재료' })
  await expect(shared.locator('.quantity').first()).toContainText('10')
  await expect(shared.locator('.quantity.missing')).toContainText('6')

  const intermediate = page.locator('.material-row').filter({ hasText: 'E2E 공유 중간재' })
  await expect(intermediate.locator('.quantity').first()).toContainText('4')
  await expect(intermediate.locator('.quantity.missing')).toContainText('3')

  const raw = page.locator('.material-row').filter({ hasText: 'E2E 중간재 원료' })
  await expect(raw.locator('.quantity').first()).toContainText('6')

  await page.getByRole('button', { name: 'E2E 연금 완제품 목표 제거' }).click()
  await expect(shared.locator('.quantity').first()).toContainText('4')
  await expect(shared.locator('.quantity.missing')).toContainText('0')
  await expect(intermediate.locator('.quantity').first()).toContainText('2')
  await expect(intermediate.locator('.quantity.missing')).toContainText('1')
  await expect(raw.locator('.quantity').first()).toContainText('2')
})
