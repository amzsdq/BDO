import { expect, test } from '@playwright/test'

async function installFixture(page: Parameters<typeof test>[0] extends never ? never : any, weightLT?: number) {
  await page.route('**/data/dataset.json', async (route: any) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      metadata: { generatedAt: '2026-09-24T00:00:00Z', sources: ['E2E synthetic fixture'], supportedRegion: 'KR' },
      items: {
        '950001': { id: 950001, nameKo: 'E2E 무게 경계 요리' },
        '950002': { id: 950002, nameKo: 'E2E 무게 경계 재료', ...(weightLT == null ? {} : { weightLT }) },
      },
      recipes: {
        'weight-boundary': { id: 'weight-boundary', skill: 'cooking', outputItemId: 950001, yield: { min: 1, max: 1 }, variants: [{ id: 'default', inputs: [{ itemId: 950002, count: 5 }] }] },
      },
      recipesByOutput: { '950001': ['weight-boundary'] },
    }) })
  })
}

test('over-capacity request warns without clipping requested plan', async ({ page }) => {
  await installFixture(page, 0.1)
  await page.goto('/')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('20')
  await page.getByText('캐릭터 설정 · 무게/숙련도').click()
  await page.getByLabel('최대 무게 (LT)').fill('10')
  await page.getByLabel('예약 무게 (LT)').fill('2')

  const summary = page.locator('.batch-summary')
  await expect(summary).toContainText('20회분 · 10.00 LT')
  await expect(summary).toContainText('최대 적재 16회분')
  await expect(summary.getByRole('status')).toContainText('요청한 20회분은 현재 가용 무게에서 한 번에 들 수 없습니다')
  await expect(summary.locator('.carry-lines li').first()).toContainText('80개')
})

test('unknown ingredient weight fails closed instead of inventing capacity', async ({ page }) => {
  await installFixture(page)
  await page.goto('/')
  await page.getByRole('button', { name: '재료 회분' }).click()
  await page.getByLabel('준비할 재료 회분').fill('20')
  await page.getByText('캐릭터 설정 · 무게/숙련도').click()
  await page.getByLabel('최대 무게 (LT)').fill('10')
  await page.getByLabel('예약 무게 (LT)').fill('2')

  const summary = page.locator('.batch-summary')
  await expect(summary).toContainText('계산 보류')
  await expect(summary).toContainText('일부 재료의 검증된 무게가 없습니다')
  await expect(summary).toContainText('한 번에 준비 가능한 회분을 계산하지 않았습니다')
  await expect(summary.locator('.carry-lines')).toHaveCount(0)
})
