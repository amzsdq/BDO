import { describe, expect, it } from 'vitest'
import { parseCollectorArgs } from './collect-codex-substitution-groups.mjs'

describe('Codex substitution collector CLI', () => {
  it('accepts exactly one groups/out pair in either order', () => {
    const parsed = parseCollectorArgs(['--out', 'out.json', '--groups', '3001,6002'])
    expect(parsed.get('--groups')).toBe('3001,6002')
    expect(parsed.get('--out')).toBe('out.json')
  })

  it.each([
    ['--groups', '3001', '--out', 'out.json', '--extra', 'ignored'],
    ['--groups', '3001', '--groups', '6002'],
    ['--groups', '--out', 'out.json', 'x'],
  ])('rejects unknown, duplicate, or missing-value arguments', (...args) => {
    expect(() => parseCollectorArgs(args)).toThrow(/usage:/)
  })
})
