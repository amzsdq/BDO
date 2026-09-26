import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'

describe('production web evidence orchestrator', () => {
  it('is valid Node syntax', () => {
    const result = spawnSync(process.execPath, ['--check', 'scripts/collect-production-web-evidence.mjs'], { cwd: process.cwd(), encoding: 'utf8' })
    expect(result.status, result.stderr || result.stdout).toBe(0)
  })
})
