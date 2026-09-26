#!/usr/bin/env node
import fs from 'node:fs'
export function applySubstitutionEvidence(dataset, evidence) {
  if (!evidence || evidence.source !== 'BDO Codex KR' || !Array.isArray(evidence.groups)) throw new Error('invalid substitution evidence envelope')
  const collectedAt = evidence.collectedAt
  if (!collectedAt || Number.isNaN(Date.parse(collectedAt))) throw new Error('substitution evidence collectedAt is invalid')
  const next = structuredClone(dataset)
  const previousGroups = next.substitutionGroups || {}
  const removedCodexIds = new Set(Object.values(previousGroups).filter((group) => group?.source?.provider === 'BDO Codex KR' || String(group?.id || '').startsWith('codex:')).map((group) => group.id))
  next.substitutionGroups = Object.fromEntries(Object.entries(previousGroups).filter(([id, group]) => !removedCodexIds.has(id) && group?.source?.provider !== 'BDO Codex KR'))
  const seenGroupIds = new Set()
  for (const group of evidence.groups) {
    const id = String(group.id || ''); const idMatch = id.match(/^codex:(\d+)$/)
    if (!idMatch || !Array.isArray(group.members) || group.members.length < 1) throw new Error(`invalid substitution group ${id || '<missing>'}`)
    const sourceId = String(group.sourceId || '')
    if (sourceId !== idMatch[1]) throw new Error(`${id}: sourceId does not match canonical group id`)
    if (seenGroupIds.has(id)) throw new Error(`${id}: duplicate group evidence`)
    seenGroupIds.add(id)
    const sourceUrl = String(group.sourceUrl || '')
    if (sourceUrl !== `https://bdocodex.com/kr/materialgroup/${sourceId}/`) throw new Error(`${id}: evidence URL does not match sourceId`)
    const memberItemIds = []; const memberValueByItemId = {}
    for (const member of group.members) {
      const itemId = Number(member.itemId); const value = Number(member.value)
      if (!Number.isInteger(itemId) || itemId <= 0 || !next.items?.[String(itemId)]) throw new Error(`${id}: unknown/invalid member ${member.itemId}`)
      if (!Number.isFinite(value) || value <= 0) throw new Error(`${id}: invalid Worth for ${itemId}`)
      if (memberItemIds.includes(itemId)) throw new Error(`${id}: duplicate member ${itemId}`)
      memberItemIds.push(itemId); memberValueByItemId[String(itemId)] = value
    }
    next.substitutionGroups[id] = { id, memberItemIds, memberValueByItemId, source: { provider: 'BDO Codex KR', sourceId, sourceUrl, verifiedAt: collectedAt } }
  }
  const groups = Object.values(next.substitutionGroups)
  for (const recipe of Object.values(next.recipes || {})) for (const variant of recipe.variants || []) for (const input of variant.inputs || []) {
    if (removedCodexIds.has(input.substitutionGroupId) || String(input.substitutionGroupId || '').startsWith('codex:')) delete input.substitutionGroupId
    const matches = groups.filter((group) => {
      if (group.memberItemIds.length < 2 || !group.memberItemIds.includes(input.itemId)) return false
      const canonicalWorth = Number(group.memberValueByItemId?.[String(input.itemId)])
      const minimumWorth = Math.min(...group.memberItemIds.map((itemId) => Number(group.memberValueByItemId?.[String(itemId)])))
      return Number.isFinite(canonicalWorth) && canonicalWorth === minimumWorth
    })
    if (matches.length > 1) throw new Error(`${recipe.id}/${variant.id}: item ${input.itemId} belongs to multiple sourced substitution groups`)
    if (matches.length === 1) input.substitutionGroupId = matches[0].id
  }
  next.metadata ||= {}; next.metadata.sources = [...new Set([...(next.metadata.sources || []), 'BDO Codex KR material-group Worth evidence'])]
  return next
}
if (process.argv[1] && process.argv[1].endsWith('apply-substitution-evidence.mjs')) {
  const args = process.argv.slice(2)
  if (args.length !== 3 || args.some((value) => !value || value.startsWith('-'))) throw new Error('usage: node scripts/apply-substitution-evidence.mjs <dataset.json> <evidence.json> <out.json>')
  const [datasetPath, evidencePath, outPath] = args
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  fs.writeFileSync(outPath, `${JSON.stringify(applySubstitutionEvidence(dataset, evidence), null, 2)}\n`)
}
