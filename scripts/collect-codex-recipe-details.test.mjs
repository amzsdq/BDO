import { describe, expect, it } from 'vitest'
import { assertExactCatalogCoverage, catalogRecipeEntries } from './collect-codex-recipe-details.mjs'

describe('Codex recipe-detail acquisition contract', () => {
  const catalog = {
    complete: true,
    catalogs: [
      { skill: 'cooking', complete: true, recipeIds: [594, 595] },
      { skill: 'alchemy', complete: true, recipeIds: [24, 648] },
    ],
  }

  it('derives the exact skill-scoped recipe set from a complete catalog artifact', () => {
    expect(catalogRecipeEntries(catalog)).toEqual([
      { skill: 'alchemy', recipeId: 24 },
      { skill: 'alchemy', recipeId: 648 },
      { skill: 'cooking', recipeId: 594 },
      { skill: 'cooking', recipeId: 595 },
    ])
  })

  it('rejects incomplete catalog evidence before network acquisition', () => {
    expect(() => catalogRecipeEntries({ ...catalog, complete: false })).toThrow(/must be complete/)
    expect(() => catalogRecipeEntries({ complete: true, catalogs: [{ skill: 'cooking', complete: false, recipeIds: [594] }] })).toThrow(/incomplete/)
  })

  it('rejects invalid and duplicate catalog ids', () => {
    expect(() => catalogRecipeEntries({ complete: true, catalogs: [{ skill: 'cooking', complete: true, recipeIds: [0] }] })).toThrow(/invalid recipe id/)
    expect(() => catalogRecipeEntries({ complete: true, catalogs: [{ skill: 'cooking', complete: true, recipeIds: [594, 594] }] })).toThrow(/duplicate/)
  })

  it('requires exact catalog-to-detail coverage', () => {
    const expected = catalogRecipeEntries(catalog)
    expect(() => assertExactCatalogCoverage(expected, expected)).not.toThrow()
    expect(() => assertExactCatalogCoverage(expected, expected.slice(1))).toThrow(/missing=alchemy:24/)
    expect(() => assertExactCatalogCoverage(expected, [...expected, { skill: 'cooking', recipeId: 999999 }])).toThrow(/extra=cooking:999999/)
    expect(() => assertExactCatalogCoverage(expected, [...expected, expected[0]])).toThrow(/duplicate/)
  })
})
