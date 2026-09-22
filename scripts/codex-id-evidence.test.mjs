import assert from 'node:assert/strict'
import test from 'node:test'
import { recipeIdsFromJson } from './codex-id-evidence.mjs'

test('accepts recipe-specific ids and canonical recipe URLs', () => {
  assert.deepEqual(recipeIdsFromJson({ data: [
    { recipe_id: 42, id: 900001 },
    { recipeId: '7', href: '/kr/recipe/11/' },
  ] }), [7, 11, 42])
})

test('rejects ambiguous generic ids from mixed catalog payloads', () => {
  assert.deepEqual(recipeIdsFromJson({ recordsTotal: 2, data: [
    { id: 900001, item: { id: 17 } },
    { id: 900002, category: { id: 3 } },
  ] }), [])
})
