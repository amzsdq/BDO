import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }

describe('prepare-client-broad-from-snapshot', () => {
  it('verifies snapshot hashes and broad-imports both life skills', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdo-broad-'))
    const items = [{ id: 1, name: 'Cook output' }, { id: 2, name: 'Input' }, { id: 3, name: 'Alchemy output' }]
    const recipes = [
      { type: 'COOK', output: 1, inputs: [{ item: 2, count: 1 }] },
      { type: 'ALCHEMY', output: 3, inputs: [{ item: 2, count: 2 }] },
    ]
    const itemsPath = path.join(dir, 'items.json'), recipesPath = path.join(dir, 'recipes.json'), serviceIniPath = path.join(dir, 'service.ini')
    fs.writeFileSync(itemsPath, JSON.stringify(items))
    fs.writeFileSync(recipesPath, JSON.stringify(recipes))
    fs.writeFileSync(serviceIniPath, 'TYPE=KR\r\n')
    fs.writeFileSync(path.join(dir, 'provenance.json'), JSON.stringify({
      schemaVersion: 1,
      supportedRegion: 'KR',
      extractorRevision: '5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2',
      clientFingerprint: `sha256:${'0'.repeat(64)}`,
      regionEvidence: { file: 'service.ini', type: 'KR', sha256: hash(serviceIniPath) },
      artifactSha256: { 'items.json': hash(itemsPath), 'recipes.json': hash(recipesPath), 'service.ini': hash(serviceIniPath) },
    }))
    const provenancePath = path.join(dir, 'provenance.json')
    fs.writeFileSync(provenancePath, '\uFEFF' + fs.readFileSync(provenancePath, 'utf8'))
    const run = spawnSync(process.execPath, ['scripts/prepare-client-broad-from-snapshot.mjs', dir], { cwd: process.cwd(), encoding: 'utf8' })
    expect(run.status, run.stderr || run.stdout).toBe(0)
    const dataset = JSON.parse(fs.readFileSync(path.join(dir, 'client-broad.json'), 'utf8'))
    expect(dataset.metadata.counts).toEqual({ cooking: 1, alchemy: 1 })
    fs.writeFileSync(recipesPath, JSON.stringify([...recipes, recipes[0]]))
    const tampered = spawnSync(process.execPath, ['scripts/prepare-client-broad-from-snapshot.mjs', dir], { cwd: process.cwd(), encoding: 'utf8' })
    expect(tampered.status).not.toBe(0)
    expect(tampered.stderr).toMatch(/SHA-256 does not match/)

    fs.writeFileSync(recipesPath, JSON.stringify(recipes))
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
