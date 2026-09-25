import { describe, expect, it } from 'vitest'
import { validateCatalogEntryEvidence } from './catalog-release-evidence.mjs'

function entry(overrides = {}) {
  return {
    skill: 'cooking',
    complete: true,
    recipeCount: 2,
    endpointUsed: 'https://bdocodex.com/query.php',
    endpointFinalUrl: 'https://bdocodex.com/query.php',
    endpointRequest: { method: 'POST', params: { a: 'recipes', type: 'culinary' } },
    endpointEvidence: {
      recordsReported: null,
      completenessMode: 'unpaginated-full-array+rendered-id-crosscheck',
      requestPaginationParametersPresent: false,
      fullArrayRows: 2,
      renderedRecipeIds: 2,
    },
    countMatchesExpected: null,
    ...overrides,
  }
}

describe('catalog release evidence parity helper', () => {
  it('accepts a captured POST full-array cross-check', () => {
    expect(validateCatalogEntryEvidence(entry(), 'cooking')).toEqual({ ok: true })
  })

  it('rejects a captured POST whose request scope belongs to another skill', () => {
    const candidate = entry({ endpointRequest: { method: 'POST', params: { a: 'recipes', type: 'alchemy' } } })
    expect(validateCatalogEntryEvidence(candidate, 'cooking')).toMatchObject({ ok: false, reason: expect.stringContaining('scope') })
  })

  it('rejects an unpaginated full-array claim when rendered ids do not cover every row', () => {
    const candidate = entry({ endpointEvidence: { recordsReported: null, completenessMode: 'unpaginated-full-array+rendered-id-crosscheck', requestPaginationParametersPresent: false, fullArrayRows: 2, renderedRecipeIds: 1 } })
    expect(validateCatalogEntryEvidence(candidate, 'cooking')).toMatchObject({ ok: false, reason: expect.stringContaining('completeness evidence') })
  })

  it('rejects malformed independent expected-count evidence', () => {
    const candidate = entry({
      endpointEvidence: { recordsReported: null },
      countMatchesExpected: true,
      expectedCountEvidence: { count: 2, source: '', observedAt: 'not-a-date' },
    })
    expect(validateCatalogEntryEvidence(candidate, 'cooking')).toMatchObject({ ok: false, reason: expect.stringContaining('completeness evidence') })
  })
})
