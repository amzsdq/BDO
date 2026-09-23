import { expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'

it('rejects trailing substitution evidence arguments instead of ignoring them', () => {
  const result = spawnSync(process.execPath, ['scripts/apply-substitution-evidence.mjs', 'dataset.json', 'evidence.json', 'out.json', 'ignored'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('usage: node scripts/apply-substitution-evidence.mjs <dataset.json> <evidence.json> <out.json>')
})
