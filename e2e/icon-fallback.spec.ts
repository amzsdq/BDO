import { expect, test } from '@playwright/test'

test('failed item image falls back to deterministic placeholder without broken image chrome', async ({ page }) => {
  await page.route('**/icons/e2e-missing.webp', (route) => route.abort())
  await page.route('**/data/dataset.json', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      metadata: { generatedAt: '2026-09-26T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
      items: {
        '940001': { id: 940001, nameKo: 'E2E 아이콘 요리', iconPath: '/icons/e2e-missing.webp' },
        '940002': { id: 940002, nameKo: 'E2E 아이콘 재료', iconPath: '/icons/e2e-missing.webp' },
      },
      recipes: { icon: { id: 'icon', skill: 'cooking', outputItemId: 940001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 940002, count: 1 }] }] } },
      recipesByOutput: { '940001': ['icon'] },
    }),
  }))
  await page.goto('/')

  const targetIcon = page.locator('.target-chip .item-icon').first()
  await expect(targetIcon.locator('span')).toHaveText('?')
  await expect(targetIcon.locator('img')).toHaveCount(0)
  const materialIcon = page.locator('.material-row .item-icon').first()
  await expect(materialIcon.locator('span')).toHaveText('?')
  await expect(materialIcon.locator('img')).toHaveCount(0)
  await expect(targetIcon).toHaveCSS('width', '24px')
  await expect(targetIcon).toHaveCSS('height', '24px')
  await expect(materialIcon).toHaveCSS('width', '44px')
  await expect(materialIcon).toHaveCSS('height', '44px')
})
