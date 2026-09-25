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

export async function collectCodexSubstitutionGroups(groupIds, fetchImpl = fetch, collectedAt = new Date().toISOString(), options = {}) {
  const concurrency = Math.max(1, Math.min(16, Number(options.concurrency ?? 4)))
  const timeoutMs = Math.max(1, Number(options.timeoutMs ?? 15000))
  const retries = Math.max(0, Number(options.retries ?? 2))
  const ids = [...new Set(groupIds.map((rawId) => String(rawId).trim()))].sort((x, y) => Number(x) - Number(y))
  for (const id of ids) if (!/^\d+$/.test(id)) throw new Error(`invalid material group id: ${id}`)
  async function collectOne(id) {
    const sourceUrl = `${BASE}/${id}/`
    let lastError
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetchImpl(sourceUrl, { headers: { 'user-agent': 'BDO-Planner-Completeness-Audit/1.0', accept: 'text/html' }, signal: controller.signal })
        if (!response.ok) {
          const error = new Error(`${response.status} ${response.statusText}: ${sourceUrl}`)
          if (response.status !== 429 && response.status < 500) throw error
          lastError = error
        } else {
          const html = await response.text()
          return { id: `codex:${id}`, sourceId: id, sourceUrl: response.url || sourceUrl, members: parseCodexMaterialGroupHtml(html, id) }
        }
      } catch (error) {
        lastError = error
        if (error?.name !== 'AbortError' && !/fetch|network|socket|timeout/i.test(String(error?.message ?? error))) throw error
      } finally { clearTimeout(timer) }
    }
    throw lastError
  }
  const groups = new Array(ids.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
    while (true) {
      const index = next++
      if (index >= ids.length) return
      groups[index] = await collectOne(ids[index])
    }
  }))
  return { schemaVersion: 1, source: 'BDO Codex KR', collectedAt, groups }
}

export function parseCollectorArgs(args) {
  const allowed = new Set(['--groups', '--out'])
  if (args.length !== 4) throw new Error('usage: node scripts/collect-codex-substitution-groups.mjs --groups 3001,6002 --out data/codex-substitutions.json')
  const parsed = new Map()
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    const value = args[index + 1]
    if (!allowed.has(flag) || parsed.has(flag) || !value || value.startsWith('--')) throw new Error('usage: node scripts/collect-codex-substitution-groups.mjs --groups 3001,6002 --out data/codex-substitutions.json')
    parsed.set(flag, value)
  }
  if (!parsed.has('--groups') || !parsed.has('--out')) throw new Error('usage: node scripts/collect-codex-substitution-groups.mjs --groups 3001,6002 --out data/codex-substitutions.json')
  return parsed
}

if (process.argv[1] && process.argv[1].endsWith('collect-codex-substitution-groups.mjs')) {
  const parsed = parseCollectorArgs(process.argv.slice(2))
  const groupIds = parsed.get('--groups').split(',').map((value) => value.trim()).filter(Boolean)
  if (!groupIds.length) throw new Error('--groups must contain at least one material group id')
  const result = await collectCodexSubstitutionGroups(groupIds)
  fs.writeFileSync(parsed.get('--out'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(`collected ${result.groups.length} Codex material groups`)
}
