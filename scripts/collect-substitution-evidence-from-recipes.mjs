#!/usr/bin/env node

import fs from 'node:fs'
import { materialGroupIdsFromCodexRecipeEvidence } from './codex-material-group-ids.mjs'
import { collectCodexSubstitutionGroups } from './collect-codex-substitution-groups.mjs'

export async function collectReferencedSubstitutionEvidence(recipeEvidence, fetchImpl = fetch, collectedAt = new Date().toISOString()) {
  const groupIds = materialGroupIdsFromCodexRecipeEvidence(recipeEvidence)
  if (!groupIds.length) return { schemaVersion: 1, source: 'BDO Codex KR', collectedAt, groups: [] }
  return collectCodexSubstitutionGroups(groupIds, fetchImpl, collectedAt)
}

if (process.argv[1] && process.argv[1].endsWith('collect-substitution-evidence-from-recipes.mjs')) {
  const [recipeEvidencePath, outPath] = process.argv.slice(2)
  if (!recipeEvidencePath || !outPath) throw new Error('usage: node scripts/collect-substitution-evidence-from-recipes.mjs <codex-recipe-evidence.json> <out.json>')
  const recipeEvidence = JSON.parse(fs.readFileSync(recipeEvidencePath, 'utf8'))
  const result = await collectReferencedSubstitutionEvidence(recipeEvidence)
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`collected ${result.groups.length} referenced Codex material groups`)
}
