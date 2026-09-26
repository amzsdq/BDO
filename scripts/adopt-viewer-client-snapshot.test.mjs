import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

function hash(parts) { const h=crypto.createHash('sha256'); for (const p of parts) h.update(p); return h.digest('hex') }
describe('adopt-viewer-client-snapshot', () => {
  it('binds reviewed viewer output to exact KR client bytes and rejects relabeling', () => {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'bdo-viewer-adopt-')), viewer=path.join(root,'viewer'), game=path.join(root,'game'), out=path.join(root,'out')
    fs.mkdirSync(viewer); fs.mkdirSync(path.join(viewer,'icons')); fs.mkdirSync(path.join(game,'Paz'),{recursive:true})
    fs.writeFileSync(path.join(game,'Paz','pad00000.meta'),'meta'); fs.writeFileSync(path.join(game,'ads_version'),'3'); fs.writeFileSync(path.join(game,'service.ini'),'TYPE=KR\r\n')
    for (const name of ['items.json','recipes.json','mastery.json']) fs.writeFileSync(path.join(viewer,name),'[]')
    fs.writeFileSync(path.join(viewer,'icons','1.png'),'icon-bytes')
    const fp=hash([Buffer.from('meta'),Buffer.from('3')])
    fs.writeFileSync(path.join(viewer,'manifest.json'),JSON.stringify({gameFingerprint:fp.slice(0,16),appVersion:'0.1.12',lang:'en',region:'kr',extractedAt:'2026-09-26T00:00:00Z'}))
    const run=spawnSync(process.execPath,['scripts/adopt-viewer-client-snapshot.mjs',viewer,game,out],{cwd:process.cwd(),encoding:'utf8'})
    expect(run.status,run.stderr||run.stdout).toBe(0)
    const provenance=JSON.parse(fs.readFileSync(path.join(out,'provenance.json'),'utf8'))
    expect(provenance.clientFingerprint).toBe(`sha256:${fp}`)
    expect(provenance.extractorRevision).toBe('5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2')
    expect(provenance.regionEvidence.type).toBe('KR')
    expect(provenance.regionEvidence.sha256).toBe(provenance.artifactSha256['service.ini'])
    expect(provenance.viewerManifestSha256).toBe(provenance.artifactSha256['viewer-manifest.json'])
    expect(provenance.iconsSnapshotCopied).toBe(true)
    expect(fs.readFileSync(path.join(out,'icons','1.png'),'utf8')).toBe('icon-bytes')
    fs.writeFileSync(path.join(game,'service.ini'),'TYPE=NA\r\n')
    const bad=spawnSync(process.execPath,['scripts/adopt-viewer-client-snapshot.mjs',viewer,game,path.join(root,'bad')],{cwd:process.cwd(),encoding:'utf8'})
    expect(bad.status).not.toBe(0); expect(bad.stderr).toMatch(/TYPE=KR/)
    fs.writeFileSync(path.join(game,'service.ini'),'TYPE=KR\r\n'); fs.writeFileSync(path.join(game,'ads_version'),'4')
    const stale=spawnSync(process.execPath,['scripts/adopt-viewer-client-snapshot.mjs',viewer,game,path.join(root,'stale')],{cwd:process.cwd(),encoding:'utf8'})
    expect(stale.status).not.toBe(0); expect(stale.stderr).toMatch(/gameFingerprint/)
  })
})
