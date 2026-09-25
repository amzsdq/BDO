import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
function webp(){const b=Buffer.alloc(22);b.write('RIFF',0);b.writeUInt32LE(14,4);b.write('WEBP',8);b.write('VP8 ',12);b.writeUInt32LE(2,16);b.write('ok',20);return b}
function setup(){const root=mkdtempSync(join(tmpdir(),'bdo-extractor-root-'));const icons=join(root,'icons');const out=join(root,'out');const dataset=join(root,'dataset.json');mkdirSync(icons);writeFileSync(join(icons,'shared.webp'),webp());writeFileSync(join(root,'asset_redirects.json'),JSON.stringify({'urn::item:100':'icons/shared.webp','urn::item:200':'icons/shared.webp'}));return{root,icons,out,dataset}}
describe('extractor-root icon contract',()=>{
 it('accepts root and legacy icons-directory arguments with valid WebP',()=>{for(const legacy of [false,true]){const x=setup();writeFileSync(x.dataset,JSON.stringify({items:{'100':{id:100,iconPath:'icons/100.webp'}}}));execFileSync(process.execPath,[resolve('scripts/install-icon-assets.mjs'),x.dataset,legacy?x.icons:x.root,x.out]);expect(readFileSync(join(x.out,'100.webp'))).toEqual(webp())}})
 it('materializes one shared extractor asset under each canonical id',()=>{const x=setup();writeFileSync(x.dataset,JSON.stringify({items:{'100':{id:100,iconPath:'icons/100.webp'},'200':{id:200,iconPath:'icons/200.webp'}}}));execFileSync(process.execPath,[resolve('scripts/install-icon-assets.mjs'),x.dataset,x.root,x.out]);expect(JSON.parse(readFileSync(join(x.out,'icon-manifest.json'),'utf8')).itemCount).toBe(2)})
})
