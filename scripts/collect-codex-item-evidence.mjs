#!/usr/bin/env node

import fs from 'node:fs'

const BASE = 'https://bdocodex.com/kr/item'

function decodeText(fragment) {
  return fragment
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function itemInfoCard(html, expectedItemId) {
  const opening = /<div\b[^>]*>/gi
  let match
  while ((match = opening.exec(html))) {
    const classes = match[0].match(/class=["']([^"']*)["']/i)?.[1]?.split(/\s+/) ?? []
    if (!classes.includes('card') || !classes.includes('item_info')) continue
    const tag = /<\/?div\b[^>]*>/gi
    tag.lastIndex = opening.lastIndex
    let depth = 1
    let end
    while (depth > 0 && (end = tag.exec(html))) depth += /^<\/div/i.test(end[0]) ? -1 : 1
    if (depth !== 0 || !end) throw new Error(`item ${expectedItemId}: unterminated item_info card`)
    return html.slice(match.index, tag.lastIndex)
  }
  throw new Error(`item ${expectedItemId}: item_info card missing`)
}

export function parseCodexItemEvidenceHtml(html, expectedItemId) {
  const card = itemInfoCard(html, expectedItemId)
  const nameMatch = card.match(/<([a-z][\w:-]*)\b(?=[^>]*class=["'][^"']*\bitem_title\b[^"']*["'])(?=[^>]*id=["']item_name["'])[^>]*>([\s\S]*?)<\/\1>/i)
  const nameKo = nameMatch ? decodeText(nameMatch[2]) : ''
  if (!nameKo) throw new Error(`item ${expectedItemId}: Korean card-header item name missing`)

  const cardItemId = Number(decodeText(card).match(/\bID:\s*(\d+)\b/i)?.[1])
  if (!Number.isSafeInteger(cardItemId) || cardItemId !== Number(expectedItemId)) throw new Error(`item ${expectedItemId}: card item id mismatch`)

  const materialGroupIds = [...new Set([...card.matchAll(/href=["'][^"']*\/kr\/materialgroup\/(\d+)\/?["']/gi)].map((match) => String(Number(match[1]))))].sort((a, b) => Number(a) - Number(b))

  const cardText = decodeText(card)
  const weightMatch = cardText.match(/(?:무\s*게|Weight)\s*:?\s*([0-9]+(?:\.[0-9]+)?)\s*LT/i)
  const weightLT = weightMatch ? Number(weightMatch[1]) : undefined

  const masteryMatch = cardText.match(/(?:연금|Alchemy)\s*숙련도\s*([0-9][0-9,]*)\s*이상/i)
  const masteryRequirement = masteryMatch ? { skill: 'alchemy', minimumMastery: Number(masteryMatch[1].replace(/,/g, '')) } : undefined

  return { itemId: Number(expectedItemId), nameKo, ...(weightLT == null ? {} : { weightLT }), materialGroupIds, ...(masteryRequirement ? { masteryRequirement } : {}) }
}

async function fetchItemWithRetry(sourceUrl, fetchImpl, timeoutMs, retries) {
  let last
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(sourceUrl, { headers: { 'user-agent': 'BDO-Planner-Completeness-Audit/1.0', accept: 'text/html' }, signal: AbortSignal.timeout(timeoutMs) })
      if (response.ok) return response
      const error = new Error(`${response.status} ${response.statusText}: ${sourceUrl}`)
      if (response.status < 500 && response.status !== 429) throw Object.assign(error, { nonRetryable: true })
      last = error
    } catch (error) { if (error?.nonRetryable) throw error; last = error }
  }
  throw last
}

export function exactItemIdsFromRecipeDetails(details) {
  if (details?.schemaVersion !== 2 || details?.complete !== true || !Array.isArray(details.recipes)) throw new Error('schema-v2 complete recipe details required')
  if (details.supplementalDiscovery?.complete !== true) throw new Error('complete supplemental discovery required before item acquisition')
  const ids = new Set()
  for (const recipe of details.recipes) {
    if (recipe.status === 'unresolved') throw new Error(`unresolved recipe route: ${recipe.skill}:${recipe.recipeId}`)
    for (const row of [...(recipe.ingredients || []), ...(recipe.baseOutputs || []), ...(recipe.randomOutputs || [])]) {
      const itemId = Number(row.itemId)
      if (!Number.isSafeInteger(itemId) || itemId <= 0) throw new Error(`invalid item id in recipe ${recipe.recipeId}`)
      ids.add(itemId)
    }
  }
  return [...ids].sort((a, b) => a - b)
}

export async function collectCodexItemEvidence(itemIds, fetchImpl = fetch, collectedAt = new Date().toISOString(), { concurrency = 6, timeoutMs = 20000, retries = 2 } = {}) {
  const ids = [...new Set(itemIds.map((rawId) => {
    const itemId = Number(rawId)
    if (!Number.isSafeInteger(itemId) || itemId <= 0) throw new Error(`invalid item id: ${rawId}`)
    return itemId
  }))].sort((a, b) => a - b)
  const items = new Array(ids.length)
  let cursor = 0
  const worker = async () => {
    while (true) {
      const index = cursor++
      if (index >= ids.length) return
      const itemId = ids[index], sourceUrl = `${BASE}/${itemId}/`
      const response = await fetchItemWithRetry(sourceUrl, fetchImpl, timeoutMs, retries)
      items[index] = { ...parseCodexItemEvidenceHtml(await response.text(), itemId), sourceUrl: response.url || sourceUrl }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(Number(concurrency) || 1, 16)) }, () => worker()))
  return { schemaVersion: 1, source: 'BDO Codex KR', collectedAt, items }
}

if (process.argv[1] && process.argv[1].endsWith('collect-codex-item-evidence.mjs')) {
  const argv = process.argv.slice(2), args = { concurrency: 6, timeoutMs: 20000, retries: 2 }
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${flag || 'argument'}`)
    if (flag === '--items') args.items = value
    else if (flag === '--details') args.details = value
    else if (flag === '--out') args.out = value
    else if (flag === '--concurrency') args.concurrency = Number(value)
    else if (flag === '--timeout-ms') args.timeoutMs = Number(value)
    else if (flag === '--retries') args.retries = Number(value)
    else throw new Error(`unknown argument: ${flag}`)
  }
  if ((!args.items && !args.details) || (args.items && args.details) || !args.out) throw new Error('usage: node scripts/collect-codex-item-evidence.mjs (--items 6214,9203 | --details data/codex-details.json) --out data/codex-items.json [--concurrency 6] [--timeout-ms 20000] [--retries 2]')
  if (!Number.isSafeInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 16) throw new Error('--concurrency must be 1..16')
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1000) throw new Error('--timeout-ms must be >=1000')
  if (!Number.isSafeInteger(args.retries) || args.retries < 0 || args.retries > 5) throw new Error('--retries must be 0..5')
  const ids = args.details
    ? exactItemIdsFromRecipeDetails(JSON.parse(fs.readFileSync(args.details, 'utf8')))
    : args.items.split(',').map((value) => value.trim()).filter(Boolean)
  if (!ids.length) throw new Error('item acquisition scope must contain at least one item id')
  const result = await collectCodexItemEvidence(ids, fetch, new Date().toISOString(), args)
  fs.writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`collected ${result.items.length} Codex item evidence rows`)
}
