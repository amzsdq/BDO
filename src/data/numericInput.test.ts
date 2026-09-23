import { describe, expect, it } from 'vitest'
import { parseNonNegativeFiniteOrZero, parseOptionalNonNegativeFinite } from './numericInput'

describe('numeric input boundary', () => {
  it('accepts finite non-negative values', () => {
    expect(parseOptionalNonNegativeFinite('0')).toBe(0)
    expect(parseOptionalNonNegativeFinite('12.5')).toBe(12.5)
  })

  it('rejects empty, negative, non-finite, and non-numeric optional values', () => {
    expect(parseOptionalNonNegativeFinite('')).toBeUndefined()
    expect(parseOptionalNonNegativeFinite('-1')).toBeUndefined()
    expect(parseOptionalNonNegativeFinite('1e309')).toBeUndefined()
    expect(parseOptionalNonNegativeFinite('Infinity')).toBeUndefined()
    expect(parseOptionalNonNegativeFinite('nope')).toBeUndefined()
  })

  it('maps invalid inventory input to zero rather than persisting a non-finite number', () => {
    expect(parseNonNegativeFiniteOrZero('7')).toBe(7)
    expect(parseNonNegativeFiniteOrZero('1e309')).toBe(0)
    expect(parseNonNegativeFiniteOrZero('-2')).toBe(0)
  })
})
