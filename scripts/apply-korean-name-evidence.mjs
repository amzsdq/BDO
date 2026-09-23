#!/usr/bin/env node
import fs from 'node:fs'

export function applyKoreanNameEvidence(dataset, evidence) {
  if (!evidence || evidence.source !== 'BDO Codex KR' || !Array.isArray(evidence.items)) throw new Error('invalid Korean-name evidence envelope')
  if (!evidence.collectedAt || Number.isNaN(Date.parse(evidence.collectedAt))) throw new Error('Korean-name evidence collectedAt is invalid')
  const next = structuredClone(dataset)
  const seen = new Set()
  for (const row of evidence.items) {
    const itemId = Number(row.itemId)
    const nameKo = String(row.nameKo || '').trim()
    const sourceUrl = String(row.sourceUrl || '')
    if (!Number.isInteger(itemId) || itemId <= 0 || !next.items?.[String(itemId)]) throw new Error(`unknown/invalid Korean-name item ${row.itemId}`)
    if (!nameKo || /^아이템\s*#\d+$/.test(nameKo)) throw new Error(`item ${itemId}: invalid Korean display name`)
    if (sourceUrl !== `https://bdocodex.com/kr/item/${itemId}/`) throw new Error(`item ${itemId}: source URL does not match canonical item id`)
    if (seen.has(itemId)) throw new Error(`item ${itemId}: duplicate Korean-name evidence`)
    seen.add(itemId)
    next.items[String(itemId)].nameKo = nameKo
  }
  next.metadata ||= {}
  next.metadata.sources = [...new Set([...(next.metadata.sources || []), 'BDO Codex KR item-name evidence'])]
  next.metadata.koreanNameEvidence = { provider: 'BDO Codex KR', collectedAt: evidence.collectedAt, count: seen.size }
  next.metadata.koreanNamesVerified = Object.values(next.items || {}).every((item) => item?.nameKo && !/^아이템\s*#\d+$/.test(item.nameKo))
  delete next.metadata.fingerprint
  return next
}

if (process.argv[1] && process.argv[1].endsWith('apply-korean-name-evidence.mjs')) {
  const args = process.argv.slice(2)
  if (args.length !== 3 || args.some((value) => !value || value.startsWith('--'))) throw new Error('usage: node scripts/apply-korean-name-evidence.mjs <dataset.json> <evidence.json> <out.json>')
  const [datasetPath, evidencePath, outPath] = args
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  fs.writeFileSync(outPath, JSON.stringify(applyKoreanNameEvidence(dataset, evidence), null, 2) + '\n')
}
