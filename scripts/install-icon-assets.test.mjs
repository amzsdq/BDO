import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function fixtureDir() {
  const dir = mkdtempSync(join(tmpdir(), 'bdo-icons-')); const source = join(dir, 'source'); const out = join(dir, 'public-icons'); const dataset = join(dir, 'dataset.json'); mkdirSync(source); return { source, out, dataset }
}
function webp(payload='x') {
  const body=Buffer.from(payload); const pad=body.length%2; const size=4+8+body.length+pad; const b=Buffer.alloc(8+size); b.write('RIFF',0); b.writeUInt32LE(size,4); b.write('WEBP',8); b.write('VP8 ',12); b.writeUInt32LE(body.length,16); body.copy(b,20); return b
}
describe('canonical icon asset installer', () => {
  it('copies validated WebP bytes and writes deterministic hash manifest', () => {
    const {source,out,dataset}=fixtureDir(); const a=webp('a'), b=webp('bb')
    writeFileSync(join(source,'a.webp'),a); writeFileSync(join(source,'b.webp'),b)
    writeFileSync(join(source,'asset_redirects.json'),JSON.stringify({'urn::item:100':'icons/a.webp','urn::item:200':'icons/b.webp'}))
    writeFileSync(dataset,JSON.stringify({items:{'200':{id:200,iconPath:'icons/200.webp'},'100':{id:100,iconPath:'icons/100.webp'}}}))
    execFileSync(process.execPath,[resolve('scripts/install-icon-assets.mjs'),dataset,source,out])
    expect(readFileSync(join(out,'100.webp'))).toEqual(a); expect(readFileSync(join(out,'200.webp'))).toEqual(b)
    const m=JSON.parse(readFileSync(join(out,'icon-manifest.json'),'utf8')); expect(m.itemCount).toBe(2); expect(m.items.map(x=>x.itemId)).toEqual([100,200]); expect(m.setHash).toMatch(/^[a-f0-9]{64}$/)
  })
  it('rejects fake .webp text and RIFF size mismatch', () => {
    for (const bytes of [Buffer.from('icon-100'), Buffer.from('RIFF0000WEBP')]) {
      const {source,out,dataset}=fixtureDir(); writeFileSync(join(source,'a.webp'),bytes); writeFileSync(join(source,'asset_redirects.json'),JSON.stringify({'urn::item:100':'icons/a.webp'})); writeFileSync(dataset,JSON.stringify({items:{'100':{id:100,iconPath:'icons/100.webp'}}}))
      const r=spawnSync(process.execPath,[resolve('scripts/install-icon-assets.mjs'),dataset,source,out],{encoding:'utf8'}); expect(r.status).toBe(1)
    }
  })
  it('fails closed when redirect evidence is missing', () => {
    const {source,out,dataset}=fixtureDir(); writeFileSync(join(source,'asset_redirects.json'),'{}'); writeFileSync(dataset,JSON.stringify({items:{'100':{id:100,iconPath:'icons/100.webp'}}}))
    const r=spawnSync(process.execPath,[resolve('scripts/install-icon-assets.mjs'),dataset,source,out],{encoding:'utf8'}); expect(r.status).toBe(1); expect(r.stderr).toContain('redirect output')
  })
  it('rejects unsafe or noncanonical paths', () => {
    for (const redirect of ['../escape.webp','icons/a.png']) { const {source,out,dataset}=fixtureDir(); writeFileSync(join(source,'asset_redirects.json'),JSON.stringify({'urn::item:100':redirect})); writeFileSync(dataset,JSON.stringify({items:{'100':{id:100,iconPath:'icons/100.webp'}}})); expect(spawnSync(process.execPath,[resolve('scripts/install-icon-assets.mjs'),dataset,source,out]).status).toBe(1) }
  })
})
