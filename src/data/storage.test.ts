import { describe, expect, it } from 'vitest'
import { readCharacterProfile, readChecklist, writeCharacterProfile, writeChecklist } from './storage'

describe('checklist persistence', () => {
  it('round-trips valid item completion state', () => {
    let value: string | null = null
    const storage = {
      getItem: () => value,
      setItem: (_key: string, next: string) => { value = next },
    }
    writeChecklist({ '100': true, '200': false }, storage)
    expect(readChecklist(storage)).toEqual({ '100': true, '200': false })
  })

  it('fails closed on corrupt or unexpected data', () => {
    expect(readChecklist({ getItem: () => '{bad json' })).toEqual({})
    expect(readChecklist({ getItem: () => JSON.stringify({ x: true, '1': 'yes', '2': false }) })).toEqual({ '2': false })
  })
})

describe('character profile persistence', () => {
  it('round-trips weight and separate cooking/alchemy mastery', () => {
    let value: string | null = null
    const storage = {
      getItem: () => value,
      setItem: (_key: string, next: string) => { value = next },
    }
    writeCharacterProfile({ maxWeightLT: 2000, reservedWeightLT: 250, cookingMastery: 1500, alchemyMastery: 1200 }, storage)
    expect(readCharacterProfile(storage)).toEqual({ maxWeightLT: 2000, reservedWeightLT: 250, cookingMastery: 1500, alchemyMastery: 1200 })
  })

  it('drops invalid or negative profile values instead of propagating bad math', () => {
    const raw = JSON.stringify({ maxWeightLT: -1, reservedWeightLT: '10', cookingMastery: 0, alchemyMastery: null })
    expect(readCharacterProfile({ getItem: () => raw })).toEqual({
      maxWeightLT: undefined,
      reservedWeightLT: undefined,
      cookingMastery: 0,
      alchemyMastery: undefined,
    })
  })
})
