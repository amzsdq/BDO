import { describe, expect, it } from 'vitest'
import { readChecklist, writeChecklist } from './storage'

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
