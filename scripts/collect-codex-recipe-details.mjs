#!/usr/bin/env node

import fs from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const BASE = 'https://bdocodex.com/kr/recipe'
const STATUSES = new Set(['single-base', 'random-only', 'multiple-base', 'no-output', 'unavailable', 'unresolved'])

function decodeText(fragment) {
  return String(fragment || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function balancedDivByClass(html, requiredClasses) {
  const opening = /<div\b[^>]*>/gi
  let match
  while ((match = opening.exec(html))) {
    const classes = match[0].match(/class=["']([^"']*)["']/i)?.[1]?.split(/\s+/) ?? []
    if (!requiredClasses.every((name) => classes.includes(name))) continue
    const tag = /<\/?div\b[^>]*>/gi
    tag.lastIndex = opening.lastIndex
    let depth = 1
    let end
    while (depth > 0 && (end = tag.exec(html))) depth += /^<\/div/i.test(end[0]) ? -1 : 1
    if (depth !== 0 || !end) throw new Error(`unterminated ${requiredClasses.join('.')} card`)
    return html.slice(match.index, tag.lastIndex)
  }
  return null
}

function logicalRows(card) {
  const rows = [...card.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1])
  if (rows.length) return rows
  const marker = /<(?:div|p|li)\b[^>]*class=["'][^"']*\b(?:row|item|recipe)\b[^"']*["'][^>]*>/gi
  const starts = [...card.matchAll(marker)].map((match) => match.index)
  if (!starts.length) return []
  return starts.map((start, index) => card.slice(start, starts[index + 1] ?? card.length))
}

function itemRow(row) {
  const anchors = [...row.matchAll(/<a\b[^>]*href=["'][^"']*\/kr\/item\/(\d+)\/?["'][^>]*>([\s\S]*?)<\/a>/gi)]
  if (!anchors.length) return null
  const itemId = Number(anchors[0][1])
  const name = decodeText(anchors.map((entry) => entry[2]).join(' ')).trim()
  const text = decodeText(row)
  const countMatch = text.match(/(?:x|×)\s*([0-9]+(?:\.[0-9]+)?)(?:\s*[~～-]\s*([0-9]+(?:\.[0-9]+)?))?/i)
    || text.match(/([0-9]+(?:\.[0-9]+)?)\s*[~～-]\s*([0-9]+(?:\.[0-9]+)?)\s*(?:개)?\s*$/)
    || text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:개)?\s*$/)
  if (!Number.isSafeInteger(itemId) || itemId <= 0 || !countMatch) return null
  const min = Number(countMatch[1]), max = Number(countMatch[2] ?? countMatch[1])
  if (!(min > 0) || !(max >= min)) return null
  return { itemId, ...(name ? { name } : {}), min, max }
}

function rowsAfterLabel(card, labels) {
  const rows = logicalRows(card)
  let active = false
  const found = []
  for (const row of rows) {
    const text = decodeText(row)
    const isTarget = labels.some((label) => text.includes(label))
    const isAnySection = /(?:재료|Ingredients|기본 제품|Base product|랜덤 제품|추가\s*\(무작위\)\s*제품|Random product|Additional\s*\(random\)\s*products?)/i.test(text)
    if (isTarget) { active = true; const parsed = itemRow(row); if (parsed) found.push(parsed); continue }
    if (active && isAnySection) break
    if (active) { const parsed = itemRow(row); if (parsed) found.push(parsed) }
  }
  return found
}

function uniqueRows(rows) {
  const out = []
  const seen = new Set()
  for (const row of rows) {
    const key = `${row.itemId}:${row.min}:${row.max}`
    if (!seen.has(key)) { seen.add(key); out.push(row) }
  }
  return out
}

function classify(baseOutputs, randomOutputs, available) {
  if (!available) return 'unavailable'
  if (baseOutputs.length === 1) return 'single-base'
  if (baseOutputs.length > 1) return 'multiple-base'
  if (randomOutputs.length) return 'random-only'
  return 'no-output'
}

export function parseCodexRecipeDetailHtml(html, expectedRecipeId, expectedSkill) {
  const sourceText = decodeText(html)
  const unavailable = /(?:페이지를 찾을 수 없습니다|존재하지 않는 페이지|not found|recipe unavailable)/i.test(sourceText)
  if (unavailable) return { recipeId: Number(expectedRecipeId), skill: expectedSkill, status: 'unavailable', ingredients: [], baseOutputs: [], randomOutputs: [] }
  const card = balancedDivByClass(html, ['card', 'item_info'])
  if (!card) throw new Error(`recipe ${expectedRecipeId}: item_info card missing`)

  const hrefIds = [...card.matchAll(/href=["'][^"']*\/kr\/recipe\/(\d+)\/?["']/gi)].map((m) => Number(m[1]))
  if (hrefIds.length && !hrefIds.includes(Number(expectedRecipeId))) throw new Error(`recipe ${expectedRecipeId}: card recipe id mismatch`)
  if (!hrefIds.length && !new RegExp(`\\b(?:ID|Recipe\\s*ID)\\s*:?\\s*${Number(expectedRecipeId)}\\b`, 'i').test(decodeText(card))) throw new Error(`recipe ${expectedRecipeId}: card recipe identity missing`)

  const titleMatch = card.match(/<([a-z][\w:-]*)\b(?=[^>]*class=["'][^"']*(?:\bitem_title\b|\bcard-title\b)[^"']*["'])[^>]*>([\s\S]*?)<\/\1>/i)
  const titleKo = titleMatch ? decodeText(titleMatch[2]) : undefined
  const cardText = decodeText(card)
  const skillText = cardText.match(/(?:초급|견습|숙련|전문|장인|명장|도인)\s*Lv\.?\s*\d+/i)?.[0]

  const ingredients = uniqueRows(rowsAfterLabel(card, ['재료', 'Ingredients'])).map(({ itemId, name, min, max }) => {
    if (min !== max) throw new Error(`recipe ${expectedRecipeId}: ingredient ${itemId} count must be exact`)
    return { itemId, ...(name ? { name } : {}), count: min }
  })
  const baseOutputs = uniqueRows(rowsAfterLabel(card, ['기본 제품', 'Base product']))
  const randomOutputs = uniqueRows(rowsAfterLabel(card, ['랜덤 제품', '추가 (무작위) 제품', 'Random product', 'Additional (random) products']))
  const status = classify(baseOutputs, randomOutputs, true)
  if (!STATUSES.has(status)) throw new Error(`recipe ${expectedRecipeId}: invalid output status`)
  if (!ingredients.length) throw new Error(`recipe ${expectedRecipeId}: no exact ingredients parsed`)

  const result = { recipeId: Number(expectedRecipeId), skill: expectedSkill, ...(titleKo ? { titleKo } : {}), ...(skillText ? { skillText } : {}), ingredients, baseOutputs, randomOutputs, status }
  if (status === 'single-base') {
    result.outputItemId = baseOutputs[0].itemId
    result.yield = { min: baseOutputs[0].min, max: baseOutputs[0].max }
  }
  return result
}

function catalogRows(manifest) {
  if (!manifest?.complete || !Array.isArray(manifest.catalogs)) throw new Error('catalog artifact must be complete=true with catalogs')
  const rows = []
  for (const catalog of manifest.catalogs) {
    if (!catalog?.complete || !['cooking', 'alchemy'].includes(catalog.skill) || !Array.isArray(catalog.recipeIds)) throw new Error('every catalog must be complete and skill-scoped')
    for (const recipeId of catalog.recipeIds) {
      const id = Number(recipeId)
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`invalid catalog recipe id: ${recipeId}`)
      rows.push({ skill: catalog.skill, recipeId: id })
    }
  }
  const keys = rows.map((row) => `${row.skill}:${row.recipeId}`)
  if (new Set(keys).size !== keys.length) throw new Error('catalog contains duplicate (skill, recipeId) routes')
  return rows
}

async function fetchWithRetry(url, fetchImpl, timeoutMs, retries) {
  let last
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { 'user-agent': 'BDO-Planner-Completeness-Audit/1.0', accept: 'text/html' }, signal: AbortSignal.timeout(timeoutMs) })
      if (response.ok) return response
      const error = new Error(`${response.status} ${response.statusText}`)
      if (response.status < 500 && response.status !== 429) {
        error.nonRetryable = true
        throw error
      }
      last = error
    } catch (error) {
      if (error?.nonRetryable) throw error
      last = error
    }
  }
  throw last
}

export async function collectCodexRecipeDetails(catalogManifest, { fetchImpl = fetch, concurrency = 6, timeoutMs = 20000, retries = 2, collectedAt = new Date().toISOString() } = {}) {
  const routes = catalogRows(catalogManifest)
  const results = new Array(routes.length)
  let cursor = 0
  const worker = async () => {
    while (true) {
      const index = cursor++
      if (index >= routes.length) return
      const route = routes[index]
      const sourceUrl = `${BASE}/${route.recipeId}/`
      try {
        const response = await fetchWithRetry(sourceUrl, fetchImpl, timeoutMs, retries)
        results[index] = { ...parseCodexRecipeDetailHtml(await response.text(), route.recipeId, route.skill), sourceUrl: response.url || sourceUrl }
      } catch (error) {
        results[index] = { recipeId: route.recipeId, skill: route.skill, status: 'unresolved', ingredients: [], baseOutputs: [], randomOutputs: [], sourceUrl, error: String(error?.message || error) }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(Number(concurrency) || 1, 16)) }, () => worker()))
  results.sort((a, b) => a.skill.localeCompare(b.skill) || a.recipeId - b.recipeId)
  const expected = routes.map((row) => `${row.skill}:${row.recipeId}`).sort()
  const actual = results.map((row) => `${row.skill}:${row.recipeId}`).sort()
  const exactCoverage = JSON.stringify(expected) === JSON.stringify(actual)
  const unresolved = results.filter((row) => row.status === 'unresolved')
  return { schemaVersion: 2, source: 'BDO Codex KR', collectedAt, complete: exactCoverage && unresolved.length === 0, exactCoverage, unresolvedCount: unresolved.length, recipes: results }
}

function parseArgs(argv) {
  const out = { concurrency: 6, timeoutMs: 20000, retries: 2 }
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${flag || 'argument'}`)
    if (flag === '--catalog') out.catalog = value
    else if (flag === '--out') out.out = value
    else if (flag === '--concurrency') out.concurrency = Number(value)
    else if (flag === '--timeout-ms') out.timeoutMs = Number(value)
    else if (flag === '--retries') out.retries = Number(value)
    else throw new Error(`unknown argument: ${flag}`)
  }
  if (!out.catalog || !out.out) throw new Error('usage: --catalog data/codex-catalog.json --out data/codex-details.json [--concurrency 6] [--timeout-ms 20000] [--retries 2]')
  if (!Number.isSafeInteger(out.concurrency) || out.concurrency < 1 || out.concurrency > 16) throw new Error('--concurrency must be 1..16')
  if (!Number.isFinite(out.timeoutMs) || out.timeoutMs < 1000) throw new Error('--timeout-ms must be >=1000')
  if (!Number.isSafeInteger(out.retries) || out.retries < 0 || out.retries > 5) throw new Error('--retries must be 0..5')
  return out
}

if (process.argv[1] && process.argv[1].endsWith('collect-codex-recipe-details.mjs')) {
  const args = parseArgs(process.argv.slice(2))
  const catalog = JSON.parse(fs.readFileSync(args.catalog, 'utf8'))
  const result = await collectCodexRecipeDetails(catalog, args)
  await mkdir(dirname(args.out), { recursive: true })
  await writeFile(args.out, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`collected ${result.recipes.length} Codex recipe details; complete=${result.complete}; unresolved=${result.unresolvedCount}`)
  if (!result.complete) process.exitCode = 2
}
