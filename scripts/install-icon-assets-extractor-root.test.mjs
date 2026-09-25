import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('extractor-root icon contract', () => {
  it('resolves asset_redirects.json from the extractor data root', () => {
    const root = mkdtempSync(join(tmpdir(), 'bdo-extractor-root-'))
    const icons = join(root, 'icons')
    const out = join(root, 'planner-icons')
    const dataset = join(root, 'dataset.json')
    mkdirSync(icons)
    writeFileSync(join(icons, 'shared.webp'), 'decoded-icon')
    writeFileSync(join(root, 'asset_redirects.json'), JSON.stringify({ 'urn::item:100': 'icons/shared.webp' }))
    writeFileSync(dataset, JSON.stringify({ items: { '100': { id: 100, iconPath: 'icons/100.webp' } } }))
    execFileSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, root, out])
    expect(readFileSync(join(out, '100.webp'), 'utf8')).toBe('decoded-icon')
  })


  it('accepts the legacy icons-directory argument while resolving the parent redirect map', () => {
    const root = mkdtempSync(join(tmpdir(), 'bdo-extractor-icons-arg-'))
    const icons = join(root, 'icons')
    const out = join(root, 'planner-icons')
    const dataset = join(root, 'dataset.json')
    mkdirSync(icons)
    writeFileSync(join(icons, 'shared.webp'), 'decoded-icon')
    writeFileSync(join(root, 'asset_redirects.json'), JSON.stringify({ 'urn::item:100': 'icons/shared.webp' }))
    writeFileSync(dataset, JSON.stringify({ items: { '100': { id: 100, iconPath: 'icons/100.webp' } } }))
    execFileSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, icons, out])
    expect(readFileSync(join(out, '100.webp'), 'utf8')).toBe('decoded-icon')
  })

  it('materializes shared extractor assets under each canonical planner item id', () => {
    const root = mkdtempSync(join(tmpdir(), 'bdo-extractor-shared-'))
    const icons = join(root, 'icons')
    const out = join(root, 'planner-icons')
    const dataset = join(root, 'dataset.json')
    mkdirSync(icons)
    writeFileSync(join(icons, 'shared.webp'), 'shared-icon')
    writeFileSync(join(root, 'asset_redirects.json'), JSON.stringify({
      'urn::item:100': 'icons/shared.webp',
      'urn::item:200': 'icons/shared.webp',
    }))
    writeFileSync(dataset, JSON.stringify({ items: {
      '100': { id: 100, iconPath: 'icons/100.webp' },
      '200': { id: 200, iconPath: 'icons/200.webp' },
    } }))
    execFileSync(process.execPath, [resolve('scripts/install-icon-assets.mjs'), dataset, root, out])
    expect(readFileSync(join(out, '100.webp'), 'utf8')).toBe('shared-icon')
    expect(readFileSync(join(out, '200.webp'), 'utf8')).toBe('shared-icon')
  })
})
