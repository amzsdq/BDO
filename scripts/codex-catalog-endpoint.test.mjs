import { describe, expect, it } from 'vitest'
import { validateCatalogEndpointTemplate } from './codex-catalog-endpoint.mjs'

describe('Codex complete-catalog endpoint scope', () => {
  it('requires explicit per-skill binding', () => {
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes').ok).toBe(false)
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes&skill={skill}').ok).toBe(true)
  })

  it('rejects the known item/product-scoped recipe transport as completeness evidence', () => {
    const result = validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes&type=product&item_id=123&skill={skill}&l=kr')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('cannot prove complete')
  })

  it('rejects non-Codex hosts', () => {
    expect(validateCatalogEndpointTemplate('https://example.invalid/catalog?skill={skill}').ok).toBe(false)
  })
})
