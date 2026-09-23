#!/usr/bin/env node

import fs from 'node:fs'

export function applySubstitutionEvidence(dataset, evidence) {
  if (!evidence || evidence.source !== 'BDO Codex KR' || !Array.isArray(evidence.groups)) throw new Error('invalid substitution evidence envelope')
  const collectedAt = evidence.collectedAt
  if (!collectedAt || Number.isNaN(Date.parse(collectedAt))) throw new Error('substitution evidence collectedAt is invalid')

  const next = structuredClone(dataset)
  next.substitutionGroups ||= {}
  const seenGroupIds = new Set()
  for (const group of evidence.groups) {
    const id = String(group.id || '')
    if (!id || !Array.isArray(group.members) || group.members.length < 2) throw new Error(`invalid substitution group ${id || '<missing>'}`)
    if (seenGroupIds.has(id)) throw new Error(`${id}: duplicate group evidence`)
    seenGroupIds.add(id)
    if (!/^https:\/\/bdocodex\.com\/kr\/materialgroup\//.test(String(group.sourceUrl || ''))) throw new Error(`${id}: unsupported evidence URL`)
    const memberItemIds = []
    const memberValueByItemId = {}
    for (const member of group.members) {
      const itemId = Number(member.itemId)
      const value = Number(member.value)
      if (!Number.isInteger(itemId) || itemId <= 0 || !next.items?.[String(itemId)]) throw new Error(`${id}: unknown/invalid member ${member.itemId}`)
      if (!Number.isFinite(value) || value <= 0) throw new Error(`${id}: invalid Worth for ${itemId}`)
      if (memberItemIds.includes(itemId)) throw new Error(`${id}: duplicate member ${itemId}`)
      memberItemIds.push(itemId)
      memberValueByItemId[String(itemId)] = value
    }
    next.substitutionGroups[id] = {
      id,
      memberItemIds,
      memberValueByItemId,
      source: { provider: 'BDO Codex KR', sourceId: String(group.sourceId || id), sourceUrl: group.sourceUrl, verifiedAt: collectedAt },
    }
  }

  // Bind only when the sourced evidence makes membership unambiguous. This turns
  // group evidence into planner behavior without guessing from item quality/name.
  const groups = Object.values(next.substitutionGroups)
  for (const recipe of Object.values(next.recipes || {})) {
    for (const variant of recipe.variants || []) {
      for (const input of variant.inputs || []) {
        const matches = groups.filter((group) => group.memberItemIds.includes(input.itemId))
        if (matches.length > 1) throw new Error(`${recipe.id}/${variant.id}: item ${input.itemId} belongs to multiple sourced substitution groups`)
        if (matches.length === 1) input.substitutionGroupId = matches[0].id
      }
    }
  }

  next.metadata ||= {}
  next.metadata.sources = [...new Set([...(next.metadata.sources || []), 'BDO Codex KR material-group Worth evidence'])]
  return next
}

if (process.argv[1] && process.argv[1].endsWith('apply-substitution-evidence.mjs')) {
  const [datasetPath, evidencePath, outPath] = process.argv.slice(2)
  if (!datasetPath || !evidencePath || !outPath) throw new Error('usage: node scripts/apply-substitution-evidence.mjs <dataset.json> <evidence.json> <out.json>')
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  fs.writeFileSync(outPath, `${JSON.stringify(applySubstitutionEvidence(dataset, evidence), null, 2)}\n`)
}
