#!/usr/bin/env node

import fs from 'node:fs'

function normalizeGroupId(value) {
  if (Number.isInteger(value) && value > 0) return String(value)
  if (typeof value === 'string') {
    const match = value.match(/(?:materialgroup\/)?(\d+)\/?$/i)
    if (match && Number(match[1]) > 0) return String(Number(match[1]))
  }
  if (value && typeof value === 'object') {
    for (const key of ['id', 'material_group_id', 'group_id', 'url', 'href']) {
      const id = normalizeGroupId(value[key]); if (id) return id
    }
  }
  return null
}

export function materialGroupIdsFromCodexRecipeEvidence(value) {
  const ids = new Set()
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { for (const entry of node) visit(entry); return }
    for (const [key, entry] of Object.entries(node)) {
      if (key === 'material_group' || key === 'materialGroup' || key === 'material_group_id') {
        const id = normalizeGroupId(entry); if (id) ids.add(id)
      }
      if (key === 'materialGroupIds' && Array.isArray(entry)) {
        for (const value of entry) { const id = normalizeGroupId(value); if (id) ids.add(id) }
      }
      visit(entry)
    }
  }
  visit(value)
  return [...ids].sort((a, b) => Number(a) - Number(b))
}

if (process.argv[1] && process.argv[1].endsWith('codex-material-group-ids.mjs')) {
  const input = process.argv[2]
  if (!input) throw new Error('usage: node scripts/codex-material-group-ids.mjs <codex-recipe-evidence.json>')
  const ids = materialGroupIdsFromCodexRecipeEvidence(JSON.parse(fs.readFileSync(input, 'utf8')))
  if (!ids.length) throw new Error('no material_group ids found in Codex recipe evidence')
  process.stdout.write(`${ids.join(',')}\n`)
}
