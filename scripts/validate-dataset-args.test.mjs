import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./validate-dataset.mjs', import.meta.url))

function run(args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' })
}

describe('validate-dataset CLI arguments', () => {
  it.each([
    [],
    ['--help'],
    ['dataset.json', 'ignored.json'],
    ['dataset.json', '--unexpected'],
  ])('fails closed for malformed invocation %j', (args) => {
    const result = run(args)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('usage: node scripts/validate-dataset.mjs <dataset.json>')
  })
})
