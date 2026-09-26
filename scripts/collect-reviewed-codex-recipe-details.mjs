#!/usr/bin/env node
import fs from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { collectCodexRecipeDetails } from './collect-codex-recipe-details.mjs'
import { applyRetiredRouteStateToDetails } from './reviewed-retired-route-state.mjs'

function args(argv) {
  const out = { concurrency: 2, timeoutMs: 20000, retries: 2, requestDelayMs: 200, probeGaps: true }
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1]
    if (!value) throw new Error(`missing value for ${key}`)
    if (key === '--catalog') out.catalog = value
    else if (key === '--route-state-evidence') out.evidence = value
    else if (key === '--out') out.out = value
    else if (key === '--concurrency') out.concurrency = Number(value)
    else if (key === '--timeout-ms') out.timeoutMs = Number(value)
    else if (key === '--retries') out.retries = Number(value)
    else if (key === '--request-delay-ms') out.requestDelayMs = Number(value)
    else throw new Error(`unknown argument: ${key}`)
  }
  if (!out.catalog || !out.evidence || !out.out) throw new Error('required: --catalog --route-state-evidence --out')
  return out
}

const cli = args(process.argv.slice(2))
const catalog = JSON.parse(fs.readFileSync(cli.catalog, 'utf8'))
const evidence = JSON.parse(fs.readFileSync(cli.evidence, 'utf8'))
const raw = await collectCodexRecipeDetails(catalog, cli)
const result = applyRetiredRouteStateToDetails(raw, evidence)
await mkdir(dirname(cli.out), { recursive: true })
await writeFile(cli.out, JSON.stringify(result, null, 2) + '\n')
console.log(`collected ${result.recipes.length} reviewed Codex recipe details; complete=${result.complete}; unresolved=${result.unresolvedCount}`)
if (!result.complete) {
  const counts = new Map()
  for (const row of result.recipes.filter((entry) => entry.status === 'unresolved')) {
    const message = String(row.error || 'unresolved without error')
    counts.set(message, (counts.get(message) || 0) + 1)
  }
  const summary = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  console.error('top unresolved Codex detail errors:')
  for (const [message, count] of summary) console.error(`  ${count}x ${message}`)
  process.exitCode = 2
}
