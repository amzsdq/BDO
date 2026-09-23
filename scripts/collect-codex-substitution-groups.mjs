#!/usr/bin/env node

import fs from 'node:fs'

const BASE = 'https://bdocodex.com/kr/materialgroup'

function textContent(fragment) { return fragment.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim() }
function cellsFromRow(row) { return [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map((match) => textContent(match[1])) }
function worthColumnIndex(html, groupId) {
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = cellsFromRow(rowMatch[1])
    const index = cells.findIndex((cell) => /^(?:가치|worth)$/i.test(cell.trim()))
    if (index >= 0) return index
  }
  throw new Error(`material group ${groupId}: explicit Worth/가치 column not found`)
}

export function parseCodexMaterialGroupHtml(html, groupId) {
  const members = []
  const seen = new Map()
  const worthIndex = worthColumnIndex(html, groupId)
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1]
    const itemMatch = row.match(/<a[^>]+href=["'][^"']*\/item\/(\d+)\/?["'][^>]*>/i)
    if (!itemMatch) continue
    const cells = cellsFromRow(row)
    if (worthIndex >= cells.length) throw new Error(`material group ${groupId}: item row is missing explicit Worth cell`)
    const value = Number(cells[worthIndex].replace(/,/g, '').trim())
    const itemId = Number(itemMatch[1])
    if (!Number.isInteger(itemId) || itemId <= 0) continue
    if (!Number.isFinite(value) || value <= 0) throw new Error(`material group ${groupId}: invalid explicit Worth for item ${itemId}`)
    const previous = seen.get(itemId)
    if (previous != null) {
      if (previous !== value) throw new Error(`material group ${groupId}: conflicting Worth evidence for item ${itemId}: ${previous} vs ${value}`)
      continue
    }
    seen.set(itemId, value); members.push({ itemId, value })
  }
  if (members.length < 2) throw new Error(`material group ${groupId}: could not prove at least two row-local item/Worth pairs from Codex HTML`)
  return members
}

export async function collectCodexSubstitutionGroups(groupIds, fetchImpl = fetch, collectedAt = new Date().toISOString()) {
  const groups = []
  for (const rawId of groupIds) {
    const id = String(rawId).trim()
    if (!/^\d+$/.test(id)) throw new Error(`invalid material group id: ${rawId}`)
    const sourceUrl = `${BASE}/${id}/`
    const response = await fetchImpl(sourceUrl, { headers: { 'user-agent': 'BDO-Planner-Completeness-Audit/1.0', accept: 'text/html' } })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${sourceUrl}`)
    const html = await response.text()
    groups.push({ id: `codex:${id}`, sourceId: id, sourceUrl: response.url || sourceUrl, members: parseCodexMaterialGroupHtml(html, id) })
  }
  return { schemaVersion: 1, source: 'BDO Codex KR', collectedAt, groups }
}

if (process.argv[1] && process.argv[1].endsWith('collect-codex-substitution-groups.mjs')) {
  const args = process.argv.slice(2)
  const groupsIndex = args.indexOf('--groups'); const outIndex = args.indexOf('--out')
  if (groupsIndex < 0 || outIndex < 0 || !args[groupsIndex + 1] || !args[outIndex + 1]) throw new Error('usage: node scripts/collect-codex-substitution-groups.mjs --groups 3001,6002 --out data/codex-substitutions.json')
  const groupIds = args[groupsIndex + 1].split(',').map((value) => value.trim()).filter(Boolean)
  const result = await collectCodexSubstitutionGroups(groupIds)
  fs.writeFileSync(args[outIndex + 1], `${JSON.stringify(result, null, 2)}\n`)
  console.log(`collected ${result.groups.length} Codex material groups`)
}
