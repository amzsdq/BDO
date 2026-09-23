import { describe, expect, it } from 'vitest'
import { readPlanSessionResult } from './planSession'

describe('plan session forward compatibility', () => {
  it('distinguishes newer persisted versions from corrupt or absent storage', () => {
    const storage: Pick<Storage, 'getItem'> = { getItem: () => JSON.stringify({ version: 2, targets: [], futureField: true }) }
    expect(readPlanSessionResult(storage)).toMatchObject({ status: 'unsupported-version', persistedVersion: 2 })
  })

  it('keeps malformed version metadata in invalid-storage', () => {
    const storage: Pick<Storage, 'getItem'> = { getItem: () => JSON.stringify({ version: '2', targets: [] }) }
    expect(readPlanSessionResult(storage).status).toBe('invalid-storage')
  })
})
