import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { resolvePlanTarget } from './planSessionResolve'

describe('recipe-serving target discreteness', () => {
  it('rejects fractional recipe servings instead of silently ceiling them later', () => {
    const result = resolvePlanTarget(sampleDataset, {
      recipeId: 'sample-cooking',
      mode: 'servings',
      amount: 1.5,
    }, {})
    expect(result.target).toBeUndefined()
    expect(result.error).toContain('positive integer')
  })

  it('preserves integer recipe servings exactly', () => {
    expect(resolvePlanTarget(sampleDataset, {
      recipeId: 'sample-cooking',
      mode: 'servings',
      amount: 7,
    }, {}).target).toMatchObject({ mode: 'attempts', amount: 7 })
  })
})
