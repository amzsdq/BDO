import { describe, expect, it } from 'vitest'
import { sampleDataset } from './sample'
import { resolvePlanTarget } from './planSessionResolve'

describe('desired-output target discreteness', () => {
  it('rejects fractional desired output instead of silently ceiling recipe attempts', () => {
    const result = resolvePlanTarget(sampleDataset, { recipeId: 'sample-cooking', mode: 'output', amount: 1.5 }, {})
    expect(result.target).toBeUndefined()
    expect(result.error).toContain('positive integer')
  })

  it('preserves integer desired output and defaults to conservative minimum yield', () => {
    expect(resolvePlanTarget(sampleDataset, { recipeId: 'sample-cooking', mode: 'output', amount: 7 }, {}).target)
      .toMatchObject({ mode: 'output', amount: 7, yieldPolicy: 'minimum' })
  })

  it.each(['minimum', 'expected', 'maximum'] as const)('preserves selected %s yield policy', (yieldPolicy) => {
    expect(resolvePlanTarget(sampleDataset, { recipeId: 'sample-cooking', mode: 'output', amount: 7, yieldPolicy }, {}).target)
      .toMatchObject({ mode: 'output', amount: 7, yieldPolicy })
  })
})
