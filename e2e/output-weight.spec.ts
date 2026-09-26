import { expect, test, type Page } from '@playwright/test'

async function installOutputWeightFixture(page: Page, randomOnly = false) {
  await page.route('**/data/dataset.json', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      metadata: { generatedAt: '2026-09-26T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
      items: {
        '970001': { id: 970001, nameKo: 'E2E 산출 요리', weightLT: 0.2 },
        '970002': { id: 970002, nameKo: 'E2E 산출 재료', weightLT: 0.1 },
        '970003': { id: 970003, nameKo: 'E2E 확률 산출물', weightLT: 0.5 },
      },
      recipes: {
        output: {
          id: 'output', skill: 'cooking', outputItemId: 970001, yield: { min: 1, max: 1 },
          variants: [{ id: 'default', inputs: [{ itemId: 970002, count: 1 }], outputEvidence: randomOnly
            ? { status: 'random-only', randomOutputs: [{ itemId: 970003, min: 1, max: 1 }] }
            : { status: 'single-base', baseOutputs: [{ itemId: 970001, min: 1, max: 4 }], randomOutputs: [{ itemId: 970003, min: 1, max: 2 }] } }],
        },
      },
      recipesByOutput: { '970001': ['output'] },
    }) })
  })
}

test('verified base output weight is shown as a range while random output is explicitly excluded', async ({ page }) => {
  await installOutputWeightFixture(page)
  await page.goto('/')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('10')
  const summary = page.locator('.summary-card').filter({ hasText: '검증된 기본 산출물 무게' })
  await expect(summary).toContainText('2.00~8.00 LT')
  await expect(summary).toContainText('확률/상위 산출물은 발생 확률 근거가 없어 합산하지 않았습니다')
})

test('random-only output does not invent a deterministic output-weight range', async ({ page }) => {
  await installOutputWeightFixture(page, true)
  await page.goto('/')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('10')
  await expect(page.getByText('검증된 기본 산출물 무게')).toHaveCount(0)
})
