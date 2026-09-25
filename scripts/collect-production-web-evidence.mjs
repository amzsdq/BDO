#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { materialGroupIdsFromCodexRecipeEvidence } from './codex-material-group-ids.mjs'

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.status !== 0) throw new Error(`${script} failed (exit ${result.status}):\n${(result.stderr || result.stdout || '').trim()}`)
  if (result.stdout) process.stdout.write(result.stdout)
}

function parseArgs(argv) {
  const out = { outDir: 'artifacts', routeStateEvidence: 'data/evidence/retired-crafting-routes.kr.json' }
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${flag || 'argument'}`)
    if (flag === '--out-dir') out.outDir = value
    else if (flag === '--route-state-evidence') out.routeStateEvidence = value
    else throw new Error(`unknown argument: ${flag}`)
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
fs.mkdirSync(args.outDir, { recursive: true })
const catalog = path.join(args.outDir, 'codex-catalog.json')
const details = path.join(args.outDir, 'codex-details.json')
const items = path.join(args.outDir, 'codex-items.json')
const groups = path.join(args.outDir, 'codex-substitutions.json')

run('scripts/collect-codex-catalog-browser.mjs', ['--out', catalog])
run('scripts/collect-reviewed-codex-recipe-details.mjs', ['--catalog', catalog, '--route-state-evidence', args.routeStateEvidence, '--out', details])
run('scripts/collect-codex-item-evidence.mjs', ['--details', details, '--out', items])
const itemEvidence = JSON.parse(fs.readFileSync(items, 'utf8'))
const groupIds = materialGroupIdsFromCodexRecipeEvidence(itemEvidence)
if (!groupIds.length) throw new Error('reviewed exact item evidence exposed no material-group ids')
run('scripts/collect-codex-substitution-groups.mjs', ['--groups', groupIds.join(','), '--out', groups])
console.log(JSON.stringify({ ok: true, catalog, details, items, groups, materialGroups: groupIds.length }))
