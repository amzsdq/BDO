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
})
