import { describe, expect, it } from 'vitest'
import { catalogEndpointForSkill, validateCatalogEndpointTemplate, validateResolvedCatalogEndpoint } from './codex-catalog-endpoint.mjs'

describe('Codex complete-catalog endpoint scope', () => {
  it('requires explicit per-skill or per-category binding in a recognized scope parameter', () => {
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes').ok).toBe(false)
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes&skill={skill}').ok).toBe(true)
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes&type={category}').ok).toBe(true)
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=recipes&note={skill}').ok).toBe(false)
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
    expect(validateResolvedCatalogEndpoint('https://bdocodex.com/query.php?a=recipes&type=product&item_id=123&l=kr').ok).toBe(false)
  })

  it('requires the known Codex recipe transport, not merely a Codex-hosted URL', () => {
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/kr/recipes/culinary?skill={skill}').ok).toBe(false)
    expect(validateCatalogEndpointTemplate('https://bdocodex.com/query.php?a=items&skill={skill}').ok).toBe(false)
    expect(validateResolvedCatalogEndpoint('https://bdocodex.com/query.php?a=items&type=culinary').ok).toBe(false)
    expect(validateResolvedCatalogEndpoint('https://bdocodex.com/query.php?a=recipes&type=culinary').ok).toBe(true)
  })

  it('requires HTTPS and a Codex host for templates and resolved redirects', () => {
    expect(validateCatalogEndpointTemplate('http://bdocodex.com/query.php?a=recipes&skill={skill}').ok).toBe(false)
    expect(validateCatalogEndpointTemplate('https://example.invalid/query.php?a=recipes&skill={skill}').ok).toBe(false)
    expect(validateResolvedCatalogEndpoint('https://example.invalid/query.php?a=recipes&skill=cooking').ok).toBe(false)
    expect(validateResolvedCatalogEndpoint('https://bdocodex.com/query.php?a=recipes&type=culinary').ok).toBe(true)
  })

  it('fails closed when a configured or redirected endpoint changes the requested skill scope', () => {
    expect(validateResolvedCatalogEndpoint('https://bdocodex.com/query.php?a=recipes&type=culinary&l=kr', 'cooking').ok).toBe(true)
    expect(validateResolvedCatalogEndpoint('https://bdocodex.com/query.php?a=recipes&type=alchemy&l=kr', 'alchemy').ok).toBe(true)
    expect(validateResolvedCatalogEndpoint('https://bdocodex.com/query.php?a=recipes&type=alchemy&l=kr', 'cooking').ok).toBe(false)
    expect(validateResolvedCatalogEndpoint('https://bdocodex.com/query.php?a=recipes&type=culinary&l=kr', 'alchemy').ok).toBe(false)
    expect(validateResolvedCatalogEndpoint('https://bdocodex.com/query.php?a=recipes&skill=alchemy&l=kr', 'cooking').ok).toBe(false)
  })
})
