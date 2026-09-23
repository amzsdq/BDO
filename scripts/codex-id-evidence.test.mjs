import { describe, expect, it } from 'vitest'
import { recipeIdsFromJson } from './codex-id-evidence.mjs'

describe('Codex recipe identity evidence', () => {
  it('accepts recipe-specific ids and canonical recipe URLs', () => {
    expect(recipeIdsFromJson({ data: [
      { recipe_id: 42, id: 900001 },
      { recipeId: '7', href: '/kr/recipe/11/' },
    ] })).toEqual([7, 11, 42])
  })

  it('rejects ambiguous generic ids from mixed catalog payloads', () => {
    expect(recipeIdsFromJson({ recordsTotal: 2, data: [
      { id: 900001, item: { id: 17 } },
      { id: 900002, category: { id: 3 } },
    ] })).toEqual([])
  })

  it('rejects zero, negative and unsafe recipe identities', () => {
    expect(recipeIdsFromJson({ data: [
      { recipe_id: 0 },
      { recipeId: -7 },
      { recipe_id: Number.MAX_SAFE_INTEGER + 1 },
      { recipe_id: 12 },
      { href: '/kr/recipe/0/' },
      { href: '/kr/recipe/13/' },
    ] })).toEqual([12, 13])
  })
})
