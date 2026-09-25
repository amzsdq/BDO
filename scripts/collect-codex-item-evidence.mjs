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

  const canonicalIds = [...card.matchAll(/href=["'][^"']*\/kr\/item\/(\d+)\/?["']/gi)].map((match) => Number(match[1]))
  if (canonicalIds.length && !canonicalIds.includes(Number(expectedItemId))) throw new Error(`item ${expectedItemId}: canonical item id mismatch`)

  const materialGroupIds = [...new Set([...card.matchAll(/href=["'][^"']*\/kr\/materialgroup\/(\d+)\/?["']/gi)].map((match) => String(Number(match[1]))))].sort((a, b) => Number(a) - Number(b))

  const cardText = decodeText(card)
  const weightMatch = cardText.match(/(?:무\s*게|Weight)\s*:?\s*([0-9]+(?:\.[0-9]+)?)\s*LT/i)
  const weightLT = weightMatch ? Number(weightMatch[1]) : undefined

  const masteryMatch = cardText.match(/(?:연금|Alchemy)\s*숙련도\s*([0-9][0-9,]*)\s*이상/i)
  const masteryRequirement = masteryMatch ? { skill: 'alchemy', minimumMastery: Number(masteryMatch[1].replace(/,/g, '')) } : undefined

  return { itemId: Number(expectedItemId), nameKo, ...(weightLT == null ? {} : { weightLT }), materialGroupIds, ...(masteryRequirement ? { masteryRequirement } : {}) }
}

export async function collectCodexItemEvidence(itemIds, fetchImpl = fetch, collectedAt = new Date().toISOString()) {
  const items = []
  for (const rawId of itemIds) {
    const itemId = Number(rawId)
    if (!Number.isInteger(itemId) || itemId <= 0) throw new Error(`invalid item id: ${rawId}`)
    const sourceUrl = `${BASE}/${itemId}/`
    const response = await fetchImpl(sourceUrl, { headers: { 'user-agent': 'BDO-Planner-Completeness-Audit/1.0', accept: 'text/html' } })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${sourceUrl}`)
    items.push({ ...parseCodexItemEvidenceHtml(await response.text(), itemId), sourceUrl: response.url || sourceUrl })
  }
  return { schemaVersion: 1, source: 'BDO Codex KR', collectedAt, items }
}

if (process.argv[1] && process.argv[1].endsWith('collect-codex-item-evidence.mjs')) {
  const args = process.argv.slice(2)
  if (args.length !== 4 || args[0] !== '--items' || args[2] !== '--out') throw new Error('usage: node scripts/collect-codex-item-evidence.mjs --items 6214,9203 --out data/codex-items.json')
  const ids = args[1].split(',').map((value) => value.trim()).filter(Boolean)
  if (!ids.length) throw new Error('--items must contain at least one item id')
  const result = await collectCodexItemEvidence(ids)
  fs.writeFileSync(args[3], `${JSON.stringify(result, null, 2)}\n`)
  console.log(`collected ${result.items.length} Codex item evidence rows`)
}
