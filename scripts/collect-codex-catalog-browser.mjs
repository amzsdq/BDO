#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { chromium } from '@playwright/test'
import { recipeIdsFromJson } from './codex-id-evidence.mjs'
import { validateCapturedCatalogRequest } from './codex-catalog-endpoint.mjs'

const CATALOGS = [
  { skill: 'cooking', category: 'culinary', url: 'https://bdocodex.com/kr/recipes/culinary/' },
  { skill: 'alchemy', category: 'alchemy', url: 'https://bdocodex.com/kr/recipes/alchemy/' },
]

function parseArgs(argv) {
  const out = { out: 'data/codex-catalog.json', timeoutMs: 45000 }
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${flag || 'argument'}`)
    if (flag === '--out') out.out = value
    else if (flag === '--timeout-ms') out.timeoutMs = Number(value)
    else throw new Error(`unknown argument: ${flag}`)
  }
  if (!Number.isFinite(out.timeoutMs) || out.timeoutMs < 1000) throw new Error('--timeout-ms must be >= 1000')
  return out
}

function requestEvidence(request) {
  const url = new URL(request.url())
  const params = new URLSearchParams(url.search)
  const body = request.postData()
  if (body) {
    const bodyParams = new URLSearchParams(body)
    for (const [key, value] of bodyParams) params.set(key, value)
  }
  return {
    method: request.method(),
    params: Object.fromEntries(params.entries()),
    postData: body || null,
  }
}

function hasSkillScope(params, skill) {
  const normalized = Object.fromEntries(Object.entries(params || {}).map(([k, v]) => [k.toLowerCase(), String(v).toLowerCase()]))
  const expectedType = skill === 'cooking' ? 'culinary' : skill
  return normalized.skill === skill || normalized.type === expectedType
}

function totalFromPayload(payload) {
  for (const key of ['recordsTotal', 'iTotalRecords', 'recordsFiltered', 'iTotalDisplayRecords']) {
    const n = Number(payload?.[key])
    if (Number.isSafeInteger(n) && n >= 0) return n
  }
  return null
}

function rowsFromPayload(payload) {
  if (Array.isArray(payload?.aaData)) return payload.aaData.length
  if (Array.isArray(payload?.data)) return payload.data.length
  return 0
}

function requestHeaders(request) {
  const source = request.headers()
  const headers = {}
  for (const key of ['accept', 'content-type', 'referer', 'x-requested-with']) if (source[key]) headers[key] = source[key]
  return headers
}

async function replayPage(context, captured, start, length) {
  const request = captured.request()
  const method = request.method().toUpperCase()
  const url = new URL(request.url())
  const params = new URLSearchParams(url.search)
  const body = new URLSearchParams(request.postData() || '')
  const target = method === 'POST' ? body : params
  for (const [key, value] of [['start', start], ['length', length], ['iDisplayStart', start], ['iDisplayLength', length]]) {
    target.set(key, String(value))
  }
  url.search = params.toString()
  const headers = requestHeaders(request)
  let response
  if (method === 'POST') response = await context.request.fetch(url.toString(), { method, headers, form: Object.fromEntries(body.entries()) })
  else response = await context.request.fetch(url.toString(), { method, headers })
  if (!response.ok()) throw new Error(`Codex replay failed: ${response.status()} ${response.statusText()}`)
  return response.json()
}

async function collectCatalog(browser, catalog, timeoutMs) {
  const context = await browser.newContext({ locale: 'ko-KR' })
  const page = await context.newPage()
  const capturedPromise = page.waitForResponse((response) => {
    try {
      const request = response.request()
      const url = new URL(request.url())
      if (!['bdocodex.com', 'www.bdocodex.com'].includes(url.hostname.toLowerCase())) return false
      if (!url.pathname.toLowerCase().endsWith('/query.php')) return false
      const evidence = requestEvidence(request)
      if (String(evidence.params.a || '').toLowerCase() !== 'recipes') return false
      return hasSkillScope(evidence.params, catalog.skill)
    } catch {
      return false
    }
  }, { timeout: timeoutMs })

  await page.goto(catalog.url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
  const captured = await capturedPromise
  const evidence = requestEvidence(captured.request())
  const scope = validateCapturedCatalogRequest(captured.url(), evidence, catalog.skill)
  if (!scope.ok) throw new Error(`${catalog.skill}: captured Codex request failed scope validation: ${scope.reason}`)

  const initial = await captured.json()
  const total = totalFromPayload(initial)
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error(`${catalog.skill}: Codex response lacks a positive total-row count`)

  const ids = new Set(recipeIdsFromJson(initial, { allowCodexAaData: true }))
  let pagesFetched = 1
  const initialRows = rowsFromPayload(initial)
  if (ids.size < total) {
    const batchSize = Math.min(Math.max(initialRows || 100, 100), 500)
    ids.clear()
    for (let start = 0; start < total; start += batchSize) {
      const payload = await replayPage(context, captured, start, batchSize)
      pagesFetched += 1
      const pageIds = recipeIdsFromJson(payload, { allowCodexAaData: true })
      for (const id of pageIds) ids.add(id)
      if (rowsFromPayload(payload) === 0) break
    }
  }

  const recipeIds = [...ids].sort((a, b) => a - b)
  const complete = recipeIds.length === total
  const result = {
    skill: catalog.skill,
    catalogUrl: catalog.url,
    recipeIds,
    recipeCount: recipeIds.length,
    complete,
    endpointUsed: captured.url(),
    endpointFinalUrl: captured.url(),
    endpointRequest: evidence,
    endpointEvidence: {
      recordsReported: total,
      firstResponseRows: initialRows,
      pagesFetched,
      acquisition: 'playwright-network-capture',
    },
    countMatchesExpected: null,
  }
  await context.close()
  if (!complete) throw new Error(`${catalog.skill}: captured ${recipeIds.length} unique recipe ids but Codex reports ${total}`)
  return result
}

const args = parseArgs(process.argv.slice(2))
const browser = await chromium.launch({ headless: true })
try {
  const catalogs = []
  for (const catalog of CATALOGS) catalogs.push(await collectCatalog(browser, catalog, args.timeoutMs))
  const result = {
    schemaVersion: 3,
    source: 'BDO Codex KR',
    collectedAt: new Date().toISOString(),
    complete: catalogs.every((catalog) => catalog.complete),
    completenessRule: 'The browser collector opens each KR skill catalog, captures the real skill-scoped Codex recipe XHR, validates its request scope, then paginates that same transport until the unique recipe-id set equals the server-reported total.',
    catalogs,
  }
  await mkdir(dirname(args.out), { recursive: true })
  await writeFile(args.out, `${JSON.stringify(result, null, 2)}\n`)
  for (const catalog of catalogs) console.log(`${catalog.skill}: ${catalog.recipeCount}/${catalog.endpointEvidence.recordsReported} complete via ${catalog.endpointRequest.method} ${catalog.endpointUsed}`)
} finally {
  await browser.close()
}
