import { describe, expect, it } from 'vitest'
import { catalogEndpointForSkill, validateCatalogEndpointTemplate } from './codex-catalog-endpoint.mjs'

describe('Codex complete-catalog endpoint scope', () => {
  it('requires explicit per-skill or per-category binding', () => {
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes').ok).toBe(false)
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes&skill={skill}').ok).toBe(true)
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes&type={category}').ok).toBe(true)
    expect(catalogEndpointForSkill('https://bdocodex.com/query.php?a=recipes&type={category}', 'cooking')).toContain('type=culinary')
    expect(catalogEndpointForSkill('https://bdocodex.com/query.php?a=recipes&type={category}', 'alchemy')).toContain('type=alchemy')
  })

  it('rejects known item/product-scoped recipe transports case-insensitively', () => {
    for (const endpoint of [
      'https://bdocodex.com/query.php?a=recipes&type=product&item_id=123&skill={skill}&l=kr',
      'https://bdocodex.com/query.php?a=recipes&TYPE=PRODUCT&ITEM_ID=123&skill={skill}&l=kr',
    ]) {
      const result = validateCatalogEndpointTemplate(endpoint)
      expect(result.ok).toBe(false)
      expect(result.reason).toContain('cannot prove complete')
    }
  })

  it('requires HTTPS and a Codex host', () => {
    expect(validateCatalogEndpointTemplate('http://bdocodex.com/query.php?a=recipes&skill={skill}').ok).toBe(false)
    expect(validateCatalogEndpointTemplate('https://example.invalid/catalog?skill={skill}').ok).toBe(false)
  })
})
