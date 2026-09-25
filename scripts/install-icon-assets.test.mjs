import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function webp(seed = 0) {
  const payload = Buffer.alloc(10, seed)
  const bytes = Buffer.alloc(30)
  bytes.write('RIFF', 0, 'ascii')
  bytes.writeUInt32LE(bytes.length - 8, 4)
  bytes.write('WEBP', 8, 'ascii')
  bytes.write('VP8X', 12, 'ascii')
  bytes.writeUInt32LE(payload.length, 16)
  payload.copy(bytes, 20)
  return bytes
}

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
    writeFileSync(join(source, 'shared-a.webp'), webp(1))
    writeFileSync(join(source, 'shared-b.webp'), webp(2))
    writeFileSync(join(source, 'unreferenced.webp'), webp(9))
    writeFileSync(join(source, 'asset_redirects.json'), JSON.stringify({
      'urn::item:100': 'icons/shared-a.webp',
      'urn::item:200': 'icons/shared-b.webp',
      'urn::item:999': 'icons/unreferenced.webp',
    }))
    writeFileSync(dataset, JSON.stringify({ items: {
      '100': { id: 100, iconPath: 'icons/100.webp' },
      '200': { id: 200, iconPath: 'icons/200.webp' },
    } }))
    execFileSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, source, out])
    expect(readFileSync(join(out, '100.webp'))).toEqual(webp(1))
    expect(readFileSync(join(out, '200.webp'))).toEqual(webp(2))
    expect(existsSync(join(out, '999.webp'))).toBe(false)
    const manifest = JSON.parse(readFileSync(join(out, 'icon-manifest.json'), 'utf8'))
    expect(manifest.entries.map((entry) => entry.itemId)).toEqual([100, 200])
    expect(manifest.setHash).toMatch(/^[0-9a-f]{64}$/)
  })


  it('normalizes Windows-style redirect separators before resolving the icon', () => {
    const { source, out, dataset } = fixtureDir()
    mkdirSync(join(source, 'nested'))
    writeFileSync(join(source, 'nested', 'shared-100.webp'), webp(1))
    writeFileSync(join(source, 'asset_redirects.json'), JSON.stringify({ 'urn::item:100': 'icons\\nested\\shared-100.webp' }))
    writeFileSync(dataset, JSON.stringify({ items: { '100': { id: 100, iconPath: 'icons/100.webp' } } }))
    execFileSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, source, out])
    expect(readFileSync(join(out, '100.webp'))).toEqual(webp(1))
  })

  it('rejects a .webp path whose bytes are not RIFF/WEBP', () => {
    const { source, out, dataset } = fixtureDir()
    writeFileSync(join(source, 'fake.webp'), 'fixture')
    writeFileSync(join(source, 'asset_redirects.json'), JSON.stringify({ 'urn::item:100': 'icons/fake.webp' }))
    writeFileSync(dataset, JSON.stringify({ items: { '100': { id: 100, iconPath: 'icons/100.webp' } } }))
    const result = spawnSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, source, out], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('not a RIFF/WEBP')
  })

  it('fails closed when redirect evidence is missing for a required item', () => {
    const { source, out, dataset } = fixtureDir()
    writeFileSync(join(source, 'shared-100.webp'), webp(1))
    writeFileSync(join(source, 'asset_redirects.json'), JSON.stringify({}))
    writeFileSync(dataset, JSON.stringify({ items: { '100': { id: 100, iconPath: 'icons/100.webp' } } }))
    const result = spawnSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, source, out], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('extractor redirect output')
  })

  it('rejects redirect traversal outside the extractor icon root', () => {
    const { source, out, dataset } = fixtureDir()
    writeFileSync(join(source, 'asset_redirects.json'), JSON.stringify({ 'urn::item:100': '../escape.webp' }))
    writeFileSync(dataset, JSON.stringify({ items: { '100': { id: 100, iconPath: 'icons/100.webp' } } }))
    const result = spawnSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, source, out], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('unsafe extractor icon redirect')
  })

  it.each([
    { id: 300, iconUrl: 'https://example.invalid/300.webp' },
    { id: 300, iconPath: 'icons/301.webp' },
    { id: 300, iconPath: '../300.webp' },
    { id: 300, iconPath: 'icons/300.png' },
  ])('rejects a non-canonical production icon declaration %#', (item) => {
    const { source, out, dataset } = fixtureDir()
    writeFileSync(join(source, 'shared-300.webp'), webp(3))
    writeFileSync(join(source, 'asset_redirects.json'), JSON.stringify({ 'urn::item:300': 'icons/shared-300.webp' }))
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
