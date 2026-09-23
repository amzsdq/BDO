#!/usr/bin/env node

import { writeFile } from 'node:fs/promises'
import { recipeIdsFromJson } from './codex-id-evidence.mjs'
import { catalogEndpointForSkill, validateCatalogEndpointTemplate, validateResolvedCatalogEndpoint } from './codex-catalog-endpoint.mjs'
import { normalizeExpectedCountEvidence } from './catalog-count-evidence.mjs'

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
const expectedIndex = args.indexOf('--expected-counts')
const expectedCounts = expectedIndex >= 0 ? JSON.parse(args[expectedIndex + 1]) : null
const endpointValidation = endpointTemplate ? validateCatalogEndpointTemplate(endpointTemplate) : { ok: false, reason: 'catalog endpoint template is required' }
if (endpointTemplate && !endpointValidation.ok) throw new Error(endpointValidation.reason)

async function getText(url, init) {
  const response = await fetch(url, { ...init, headers: { 'user-agent': 'BDO-Planner-Completeness-Audit/1.0', accept: 'text/html,application/json;q=0.9,*/*;q=0.8', ...(init?.headers || {}) } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return { text: await response.text(), finalUrl: response.url }
}
function recipeIdsFromHtml(html) { const ids = new Set(); for (const match of html.matchAll(/\/kr\/recipe\/(\d+)\//g)) ids.add(Number(match[1])); return [...ids].sort((a, b) => a - b) }
function candidateEndpoints(html) { const candidates = new Set(); for (const match of html.matchAll(/(?:ajax|url|source)\s*[:=]\s*["']([^"']+)["']/gi)) { const value = match[1]; if (/recipe|datatable|ajax|server/i.test(value)) candidates.add(value) } return [...candidates] }

async function collectCatalog(catalog) {
  const page = await getText(catalog.url)
  const directIds = recipeIdsFromHtml(page.text)
  const discoveredEndpoints = candidateEndpoints(page.text)
  let ids = directIds
  let endpointUsed = null
  let endpointFinalUrl = null
  let endpointEvidence = null
  if (endpointTemplate) {
    endpointUsed = catalogEndpointForSkill(endpointTemplate, catalog.skill)
    const configuredValidation = validateResolvedCatalogEndpoint(endpointUsed, catalog.skill)
    if (!configuredValidation.ok) throw new Error(`Configured catalog endpoint has invalid skill scope: ${configuredValidation.reason}`)
    const response = await getText(endpointUsed, { headers: { accept: 'application/json,*/*;q=0.8' } })
    endpointFinalUrl = response.finalUrl
    const finalValidation = validateResolvedCatalogEndpoint(endpointFinalUrl, catalog.skill)
    if (!finalValidation.ok) throw new Error(`Configured catalog endpoint redirected to invalid scope: ${finalValidation.reason}`)
    let parsed
    try { parsed = JSON.parse(response.text) } catch { throw new Error(`Configured endpoint did not return JSON: ${endpointUsed}`) }
    // Positional aaData[0] identities are accepted only after both configured and final endpoints pass the requested skill-scoped, non-product endpoint validator.
    ids = recipeIdsFromJson(parsed, { allowCodexAaData: configuredValidation.ok && finalValidation.ok })
    endpointEvidence = {
      topLevelKeys: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed).sort() : [],
      recordsReported: Number.isSafeInteger(Number(parsed?.recordsTotal)) ? Number(parsed.recordsTotal) : null,
      recordsFiltered: Number.isSafeInteger(Number(parsed?.recordsFiltered)) ? Number(parsed.recordsFiltered) : null,
    }
  }
  const expectedCountEvidence = normalizeExpectedCountEvidence(expectedCounts, catalog.skill)
  const expectedCount = expectedCountEvidence?.valid ? expectedCountEvidence.count : null
  const countMatchesExpected = expectedCount == null ? null : ids.length === expectedCount
  const complete = endpointValidation.ok && endpointUsed !== null && ids.length > 0 && (countMatchesExpected === true || endpointEvidence?.recordsReported === ids.length)
  return { skill: catalog.skill, catalogUrl: catalog.url, catalogFinalUrl: page.finalUrl, recipeIds: ids, recipeCount: ids.length, directHtmlRecipeIds: directIds.length, discoveredEndpointCandidates: discoveredEndpoints, endpointUsed, endpointFinalUrl, endpointEvidence, expectedCountEvidence, expectedCount, countMatchesExpected, complete }
}

const catalogs = []
for (const catalog of CATALOGS) catalogs.push(await collectCatalog(catalog))
const result = {
  schemaVersion: 2,
  source: 'BDO Codex KR',
  collectedAt: new Date().toISOString(),
  complete: catalogs.every((catalog) => catalog.complete),
  completenessRule: 'A non-empty list is insufficient. Each catalog requires a requested-skill-bound, non-product-scoped bdocodex.com recipe endpoint before and after redirects plus either provenance-bearing independent expected-count evidence or endpoint recordsTotal equal to the unique recipe count. Bare caller-supplied counts and ambiguous generic JSON id fields are not completeness evidence.',
  catalogs,
}
await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`)
for (const catalog of catalogs) {
  console.log(`${catalog.skill}: ${catalog.recipeIds.length} recipe ids; complete=${catalog.complete}`)
  if (!catalog.complete) console.error(`${catalog.skill}: completeness is unproven; a non-empty or partially scoped response must not pass the release gate.`)
}
if (!result.complete) process.exitCode = 2
