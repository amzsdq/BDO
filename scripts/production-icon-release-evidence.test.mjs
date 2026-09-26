import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { assertProductionIconReleaseEvidence } from './production-icon-release-evidence.mjs'
import { writeVerifiedIconFixture } from './test-icon-fixture.mjs'

describe('production icon release evidence', () => {
  it('binds release acceptance to exact canonical icon bytes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bdo-release-icons-'))
    const dataDir = path.join(root, 'public', 'data'), iconRoot = path.join(root, 'public', 'icons')
    fs.mkdirSync(dataDir, { recursive: true })
    const datasetFile = path.join(dataDir, 'dataset.json')
    const dataset = { items: { '1': { id: 1, iconPath: 'icons/1.webp' } } }
    fs.writeFileSync(datasetFile, JSON.stringify(dataset))
    writeVerifiedIconFixture(iconRoot, [1])
    expect(assertProductionIconReleaseEvidence(datasetFile, dataset).itemCount).toBe(1)
    fs.appendFileSync(path.join(iconRoot, '1.webp'), 'tamper')
    expect(() => assertProductionIconReleaseEvidence(datasetFile, dataset)).toThrow(/RIFF size mismatch|hash mismatch/)
  })
})
