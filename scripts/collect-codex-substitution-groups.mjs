#!/usr/bin/env node

import fs from 'node:fs'

const BASE = 'https://bdocodex.com/kr/materialgroup'

function textContent(fragment) { return fragment.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim() }

export function parseCodexMaterialGroupHtml(html, groupId) {
  const members = []
  const seen = new Set()
  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1]
    const itemMatch = row.match(/<a[^>]+href=["'][^"']*\/item\/(\d+)\/?["'][^>]*>/i)
    if (!itemMatch) continue
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => textContent(match[1]))
    const numericCells = cells.map((cell) => Number(cell.replace(/,/g, ''))).filter((value) => Number.isFinite(value) && value > 0)
    if (!numericCells.length) continue
    const itemId = Number(itemMatch[1]); const value = numericCells[numericCells.length - 1]
    if (!Number.isInteger(itemId) || itemId <= 0 || seen.has(itemId)) continue
    seen.add(itemId); members.push({ itemId, value })
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
