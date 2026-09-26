#!/usr/bin/env node
import fs from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { collectCodexRecipeDetails } from './collect-codex-recipe-details.mjs'
import { applyRetiredRouteStateToDetails } from './reviewed-retired-route-state.mjs'

function args(argv) {
  const out = { concurrency: 6, timeoutMs: 20000, retries: 2, probeGaps: true }
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1]
    if (!value) throw new Error(`missing value for ${key}`)
    if (key === '--catalog') out.catalog = value
    else if (key === '--route-state-evidence') out.evidence = value
    else if (key === '--out') out.out = value
    else if (key === '--concurrency') out.concurrency = Number(value)
    else if (key === '--timeout-ms') out.timeoutMs = Number(value)
    else if (key === '--retries') out.retries = Number(value)
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
if (!result.complete) process.exitCode = 2
