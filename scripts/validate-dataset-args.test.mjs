import { expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'

it('rejects trailing validator arguments instead of silently ignoring them', () => {
  const result = spawnSync(process.execPath, ['scripts/validate-dataset.mjs', 'dataset.json', '--unexpected'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })
  expect(result.status).toBe(1)
  expect(result.stderr).toContain('usage: node scripts/validate-dataset.mjs <dataset.json>')
})
