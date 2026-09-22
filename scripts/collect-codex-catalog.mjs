#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'

const BASE = 'https://bdocodex.com/kr'
const CATALOGS = [
  { skill: 'cooking', url: `${BASE}/recipes/culinary/` },
  { skill: 'alchemy', url: `${BASE}/recipes/alchemy/` },
]

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
const outPath = outIndex >= 0 ? args[outIndex + 1] : 'data/codex-catalog.json'
const endpointIndex = args.indexOf('--endpoint')
const endpointTemplate = endpointIndex >= 0 ? args[endpointIndex + 1] : process.env.BDO_CODEX_CATALOG_ENDPOINT

async function getText(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'user-agent': 'BDO-Planner-Completeness-Audit/1.0',
      accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      ...(init?.headers || {}),
    },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.text()
}

function recipeIdsFromHtml(html) {
  const ids = new Set()
  for (const match of html.matchAll(/\/kr\/recipe\/(\d+)\//g)) ids.add(Number(match[1]))
  return [...ids].sort((a, b) => a - b)
}

function candidateEndpoints(html) {
  const candidates = new Set()
  for (const match of html.matchAll(/(?:ajax|url|source)\s*[:=]\s*["']([^"']+)["']/gi)) {
    const value = match[1]
    if (/recipe|datatable|ajax|server/i.test(value)) candidates.add(value)
  }
  return [...candidates]
}

function idsFromJson(value) {
  const ids = new Set()
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    for (const [key, child] of Object.entries(node)) {
      if (/^(?:recipe_?id|id)$/i.test(key) && Number.isSafeInteger(Number(child))) ids.add(Number(child))
      if (typeof child === 'string') {
        for (const match of child.matchAll(/\/kr\/recipe\/(\d+)\//g)) ids.add(Number(match[1]))
      }
      visit(child)
    }
  }
  visit(value)
  return [...ids].sort((a, b) => a - b)
}

async function collectCatalog(catalog) {
  const html = await getText(catalog.url)
  const directIds = recipeIdsFromHtml(html)
  const discoveredEndpoints = candidateEndpoints(html)
  let ids = directIds
  let endpointUsed = null

  if (endpointTemplate) {
    endpointUsed = endpointTemplate.replace('{skill}', catalog.skill)
    const body = await getText(endpointUsed, { headers: { accept: 'application/json,*/*;q=0.8' } })
    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      throw new Error(`Configured endpoint did not return JSON: ${endpointUsed}`)
    }
    ids = idsFromJson(parsed)
  }

  return {
    skill: catalog.skill,
    catalogUrl: catalog.url,
    recipeIds: ids,
    directHtmlRecipeIds: directIds.length,
    discoveredEndpointCandidates: discoveredEndpoints,
    endpointUsed,
  }
}

const catalogs = []
for (const catalog of CATALOGS) catalogs.push(await collectCatalog(catalog))

const result = {
  schemaVersion: 1,
  source: 'BDO Codex KR',
  collectedAt: new Date().toISOString(),
  complete: catalogs.every((catalog) => catalog.recipeIds.length > 0),
  catalogs,
}

await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`)

for (const catalog of catalogs) {
  console.log(`${catalog.skill}: ${catalog.recipeIds.length} recipe ids`)
  if (catalog.recipeIds.length === 0) {
    console.error(`${catalog.skill}: server-rendered catalog exposed no recipe rows; inspect discoveredEndpointCandidates or pass --endpoint with {skill}.`)
  }
}

if (!result.complete) process.exitCode = 2
