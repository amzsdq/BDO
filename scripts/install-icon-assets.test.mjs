import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('canonical icon asset installer', () => {
  it('copies only dataset-declared canonical item-id WebP assets', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bdo-icons-'))
    const source = join(dir, 'source')
    const out = join(dir, 'public-icons')
    const dataset = join(dir, 'dataset.json')
    mkdirSync(source)
    writeFileSync(join(source, '100.webp'), 'icon-100')
    writeFileSync(join(source, '200.webp'), 'icon-200')
    writeFileSync(join(source, '999.webp'), 'unreferenced')
    writeFileSync(dataset, JSON.stringify({ items: {
      '100': { id: 100, iconPath: 'icons/100.webp' },
      '200': { id: 200, iconPath: 'icons/200.webp' },
      '300': { id: 300, iconUrl: 'https://example.invalid/300.webp' },
    } }))
    execFileSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, source, out])
    expect(readFileSync(join(out, '100.webp'), 'utf8')).toBe('icon-100')
    expect(readFileSync(join(out, '200.webp'), 'utf8')).toBe('icon-200')
    expect(existsSync(join(out, '999.webp'))).toBe(false)
  })
})
