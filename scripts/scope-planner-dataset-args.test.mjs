import { expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'

it('rejects trailing scope-dataset arguments instead of ignoring them', () => {
  const result = spawnSync(process.execPath, ['scripts/scope-planner-dataset.mjs', 'input.json', 'out.json', 'ignored'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('usage: node scripts/scope-planner-dataset.mjs <dataset.json> [out.json]')
})
