import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function fixtureDir() {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-icons-'))
  const source = join(dir, 'source')
  const out = join(dir, 'public-icons')
  const dataset = join(dir, 'dataset.json')
  mkdirSync(source)
  return { dir, source, out, dataset }
}

describe('canonical icon asset installer', () => {
  it('copies every dataset-declared canonical item-id WebP asset and nothing else', () => {
    const { source, out, dataset } = fixtureDir()
    writeFileSync(join(source, '100.webp'), 'icon-100')
    writeFileSync(join(source, '200.webp'), 'icon-200')
    writeFileSync(join(source, '999.webp'), 'unreferenced')
    writeFileSync(dataset, JSON.stringify({ items: {
      '100': { id: 100, iconPath: 'icons/100.webp' },
      '200': { id: 200, iconPath: 'icons/200.webp' },
    } }))
    execFileSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, source, out])
    expect(readFileSync(join(out, '100.webp'), 'utf8')).toBe('icon-100')
    expect(readFileSync(join(out, '200.webp'), 'utf8')).toBe('icon-200')
    expect(existsSync(join(out, '999.webp'))).toBe(false)
  })

  it.each([
    { id: 300, iconUrl: 'https://example.invalid/300.webp' },
    { id: 300, iconPath: 'icons/301.webp' },
    { id: 300, iconPath: '../300.webp' },
    { id: 300, iconPath: 'icons/300.png' },
  ])('rejects a non-canonical production icon declaration %#', (item) => {
    const { source, out, dataset } = fixtureDir()
    writeFileSync(join(source, '300.webp'), 'icon-300')
    writeFileSync(dataset, JSON.stringify({ items: { '300': item } }))
    const result = spawnSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, source, out], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('canonical local icon path')
  })

  it.each([
    [['dataset.json'], 'usage: node scripts/install-icon-assets.mjs'],
    [['dataset.json', 'icons', 'out', 'ignored'], 'usage: node scripts/install-icon-assets.mjs'],
    [['dataset.json', '--icons'], 'usage: node scripts/install-icon-assets.mjs'],
  ])('fails closed on malformed positional arguments %#', (args, message) => {
    const result = spawnSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), ...args], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(message)
  })
})
