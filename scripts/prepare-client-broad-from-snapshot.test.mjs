import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }
function iconTreeHash(root) {
  const files = []
  const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full); else files.push(full) } }
  walk(root); files.sort((a,b)=>path.relative(root,a).replaceAll('\\\\','/').localeCompare(path.relative(root,b).replaceAll('\\\\','/')))
  const h=crypto.createHash('sha256'); for(const file of files){h.update(path.relative(root,file).replaceAll('\\\\','/'));h.update('\0');h.update(fs.readFileSync(file));h.update('\0')} return h.digest('hex')
}

describe('prepare-client-broad-from-snapshot', () => {
  it('verifies snapshot hashes and broad-imports both life skills', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdo-broad-'))
    const items = [{ id: 1, name: 'Cook output' }, { id: 2, name: 'Input' }, { id: 3, name: 'Alchemy output' }]
    const recipes = [
      { type: 'COOK', output: 1, inputs: [{ item: 2, count: 1 }] },
      { type: 'ALCHEMY', output: 3, inputs: [{ item: 2, count: 2 }] },
    ]
    const itemsPath = path.join(dir, 'items.json'), recipesPath = path.join(dir, 'recipes.json'), masteryPath = path.join(dir, 'mastery.json'), serviceIniPath = path.join(dir, 'service.ini')
    fs.writeFileSync(itemsPath, JSON.stringify(items))
    fs.writeFileSync(recipesPath, JSON.stringify(recipes))
    fs.writeFileSync(masteryPath, JSON.stringify({ cooking: [], alchemy: [] }))
    fs.writeFileSync(serviceIniPath, 'TYPE=KR\r\n')
    fs.writeFileSync(path.join(dir, 'provenance.json'), JSON.stringify({
      schemaVersion: 1,
      supportedRegion: 'KR',
      extractorRevision: '5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2',
      clientFingerprint: `sha256:${'0'.repeat(64)}`,
      regionEvidence: { file: 'service.ini', type: 'KR', sha256: hash(serviceIniPath) },
      artifactSha256: { 'items.json': hash(itemsPath), 'recipes.json': hash(recipesPath), 'mastery.json': hash(masteryPath), 'service.ini': hash(serviceIniPath) },
    }))
    const provenancePath = path.join(dir, 'provenance.json')
    fs.writeFileSync(provenancePath, '\uFEFF' + fs.readFileSync(provenancePath, 'utf8'))
    const run = spawnSync(process.execPath, ['scripts/prepare-client-broad-from-snapshot.mjs', dir], { cwd: process.cwd(), encoding: 'utf8' })
    expect(run.status, run.stderr || run.stdout).toBe(0)
    const dataset = JSON.parse(fs.readFileSync(path.join(dir, 'client-broad.json'), 'utf8'))
    expect(dataset.metadata.counts).toEqual({ cooking: 1, alchemy: 1 })

    const iconsDir = path.join(dir, 'icons')
    fs.mkdirSync(iconsDir)
    fs.writeFileSync(path.join(iconsDir, '1.webp'), 'icon-one')
    const viewerProvenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8').slice(1))
    viewerProvenance.source = 'installed Black Desert client via reviewed bdo-viewer'
    viewerProvenance.iconsSnapshotSha256 = iconTreeHash(iconsDir)
    fs.writeFileSync(provenancePath, JSON.stringify(viewerProvenance))
    const viewerBound = spawnSync(process.execPath, ['scripts/prepare-client-broad-from-snapshot.mjs', dir], { cwd: process.cwd(), encoding: 'utf8' })
    expect(viewerBound.status, viewerBound.stderr || viewerBound.stdout).toBe(0)
    fs.writeFileSync(path.join(iconsDir, '1.webp'), 'tampered-icon')
    const tamperedIcons = spawnSync(process.execPath, ['scripts/prepare-client-broad-from-snapshot.mjs', dir], { cwd: process.cwd(), encoding: 'utf8' })
    expect(tamperedIcons.status).not.toBe(0)
    expect(tamperedIcons.stderr).toMatch(/icons snapshot SHA-256 does not match/)
    fs.writeFileSync(path.join(iconsDir, '1.webp'), 'icon-one')
    viewerProvenance.source = 'test snapshot'
    delete viewerProvenance.iconsSnapshotSha256
    fs.writeFileSync(provenancePath, JSON.stringify(viewerProvenance))

    fs.writeFileSync(recipesPath, JSON.stringify([...recipes, recipes[0]]))
    const tampered = spawnSync(process.execPath, ['scripts/prepare-client-broad-from-snapshot.mjs', dir], { cwd: process.cwd(), encoding: 'utf8' })
    expect(tampered.status).not.toBe(0)
    expect(tampered.stderr).toMatch(/SHA-256 does not match/)

    fs.writeFileSync(recipesPath, JSON.stringify(recipes))
    fs.writeFileSync(masteryPath, JSON.stringify({ cooking: [{ mastery: 0, rates: [] }], alchemy: [] }))
    const tamperedMastery = spawnSync(process.execPath, ['scripts/prepare-client-broad-from-snapshot.mjs', dir], { cwd: process.cwd(), encoding: 'utf8' })
    expect(tamperedMastery.status).not.toBe(0)
    expect(tamperedMastery.stderr).toMatch(/mastery\.json SHA-256 does not match/)
    fs.writeFileSync(masteryPath, JSON.stringify({ cooking: [], alchemy: [] }))
    fs.writeFileSync(serviceIniPath, 'TYPE=NA\r\n')
    const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8').replace(/^\uFEFF/, ''))
    provenance.regionEvidence.sha256 = hash(serviceIniPath)
    provenance.artifactSha256['service.ini'] = hash(serviceIniPath)
    fs.writeFileSync(provenancePath, JSON.stringify(provenance))
    const relabeled = spawnSync(process.execPath, ['scripts/prepare-client-broad-from-snapshot.mjs', dir], { cwd: process.cwd(), encoding: 'utf8' })
    expect(relabeled.status).not.toBe(0)
    expect(relabeled.stderr).toMatch(/TYPE=KR/)
  })
})
