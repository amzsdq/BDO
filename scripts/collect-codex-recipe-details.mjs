#!/usr/bin/env node

import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { chromium } from '@playwright/test'

export function catalogRecipeEntries(catalogArtifact) {
  if (!catalogArtifact?.complete || !Array.isArray(catalogArtifact.catalogs)) throw new Error('catalog artifact must be complete')
  const out = []
  const seen = new Set()
  for (const catalog of catalogArtifact.catalogs) {
    if (!['cooking', 'alchemy'].includes(catalog?.skill) || catalog.complete !== true || !Array.isArray(catalog.recipeIds)) {
      throw new Error('catalog contains an incomplete or unsupported skill entry')
    }
    for (const rawId of catalog.recipeIds) {
      const recipeId = Number(rawId)
      if (!Number.isSafeInteger(recipeId) || recipeId <= 0) throw new Error(`${catalog.skill}: invalid recipe id: ${rawId}`)
      const key = `${catalog.skill}:${recipeId}`
      if (seen.has(key)) throw new Error(`duplicate catalog recipe id: ${key}`)
      seen.add(key)
      out.push({ skill: catalog.skill, recipeId })
    }
  }
  if (!out.length) throw new Error('catalog contains no recipes')
  return out.sort((a, b) => a.skill.localeCompare(b.skill) || a.recipeId - b.recipeId)
}

export function assertExactCatalogCoverage(expected, recipes) {
  const key = (entry) => `${entry.skill}:${Number(entry.recipeId)}`
  const expectedKeys = expected.map(key).sort()
  const actualKeys = recipes.map(key).sort()
  if (new Set(actualKeys).size !== actualKeys.length) throw new Error('recipe-detail manifest contains duplicate skill/recipe ids')
  if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
    const expectedSet = new Set(expectedKeys), actualSet = new Set(actualKeys)
    const missing = expectedKeys.filter((value) => !actualSet.has(value))
    const extra = actualKeys.filter((value) => !expectedSet.has(value))
    throw new Error(`recipe-detail coverage mismatch: missing=${missing.join(',') || 'none'} extra=${extra.join(',') || 'none'}`)
  }
}

function parseArgs(argv) {
  const out = { catalog: '', out: 'artifacts/codex-recipe-details.json', timeoutMs: 30000 }
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i], value = argv[i + 1]
    if (!value || value.startsWith('--')) throw new Error(`missing value for ${flag || 'argument'}`)
    if (flag === '--catalog') out.catalog = value
    else if (flag === '--out') out.out = value
    else if (flag === '--timeout-ms') out.timeoutMs = Number(value)
    else throw new Error(`unknown argument: ${flag}`)
  }
  if (!out.catalog) throw new Error('--catalog is required')
  if (!Number.isFinite(out.timeoutMs) || out.timeoutMs < 1000) throw new Error('--timeout-ms must be >= 1000')
  return out
}

async function extractRecipe(page, expected) {
  const sourceUrl = `https://bdocodex.com/kr/recipe/${expected.recipeId}/`
  const response = await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: page._detailTimeoutMs })
  if (!response?.ok()) throw new Error(`${expected.skill}:${expected.recipeId}: HTTP ${response?.status() ?? 'no-response'}`)
  const detail = await page.evaluate(({ recipeId, expectedSkill }) => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim()
    const bodyText = normalize(document.body.innerText)
    const idMatch = bodyText.match(/(?:^|\s)ID:\s*(\d+)(?:\s|$)/)
    const actualRecipeId = idMatch ? Number(idMatch[1]) : null
    const title = normalize(document.querySelector('h1')?.textContent || document.title.replace(/\s*-\s*BDO Codex.*$/i, ''))
    const skill = /(?:^|\s)요리(?:\s|$)/.test(bodyText) ? 'cooking' : /(?:^|\s)연금(?:\s|$)/.test(bodyText) ? 'alchemy' : null

    function section(marker, stopMarkers) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let start = null, stop = null
      while (walker.nextNode()) {
        const text = normalize(walker.currentNode.textContent)
        if (!start && text.includes(marker)) start = walker.currentNode.parentElement
        else if (start && stopMarkers.some((value) => text.includes(value))) { stop = walker.currentNode.parentElement; break }
      }
      if (!start) return []
      const all = [...document.querySelectorAll('a[href*="/kr/item/"]')]
      return all.filter((anchor) => {
        const relationStart = start.compareDocumentPosition(anchor)
        const afterStart = Boolean(relationStart & Node.DOCUMENT_POSITION_FOLLOWING)
        if (!afterStart) return false
        if (!stop) return true
        const relationStop = stop.compareDocumentPosition(anchor)
        return Boolean(relationStop & Node.DOCUMENT_POSITION_PRECEDING)
      }).map((anchor) => {
        const href = anchor.getAttribute('href') || ''
        const id = Number(href.match(/\/kr\/item\/(\d+)\//)?.[1])
        const name = normalize(anchor.textContent)
        const row = normalize(anchor.parentElement?.textContent || '')
        const countMatch = row.match(/(\d+(?:\.\d+)?)\s*-?\s*[^\d]*$/) || row.match(/^(\d+(?:\.\d+)?)/)
        return { itemId: id, name, count: countMatch ? Number(countMatch[1]) : null, row }
      }).filter((entry) => Number.isSafeInteger(entry.itemId) && entry.itemId > 0)
    }

    const ingredients = section('제작 재료', ['제작 결과'])
    const outputs = section('제작 결과', ['참고 :', '참고:', '기술 계산기'])
    return { actualRecipeId, titleKo: title, skill, ingredients, outputs, bodyText, expectedSkill }
  }, { recipeId: expected.recipeId, expectedSkill: expected.skill })

  if (detail.actualRecipeId !== expected.recipeId) throw new Error(`${expected.skill}:${expected.recipeId}: page ID mismatch (${detail.actualRecipeId})`)
  if (detail.skill !== expected.skill) throw new Error(`${expected.skill}:${expected.recipeId}: skill mismatch (${detail.skill})`)
  if (!detail.titleKo) throw new Error(`${expected.skill}:${expected.recipeId}: missing Korean title`)
  if (!detail.ingredients.length || detail.ingredients.some((entry) => !Number.isFinite(entry.count) || entry.count <= 0)) {
    throw new Error(`${expected.skill}:${expected.recipeId}: ingredients are missing or have unparseable counts`)
  }

  const baseMarker = detail.bodyText.indexOf('기본 제품:')
  const randomMarker = detail.bodyText.indexOf('추가 (무작위) 제품:')
  const baseOutputs = detail.outputs.filter((entry) => {
    if (baseMarker < 0) return false
    const token = entry.name
    const pos = detail.bodyText.indexOf(token, baseMarker)
    return pos >= baseMarker && (randomMarker < 0 || pos < randomMarker)
  })
  const randomOutputs = detail.outputs.filter((entry) => !baseOutputs.some((base) => base.itemId === entry.itemId && base.name === entry.name))
  const normalizeOutput = (entry) => ({ itemId: entry.itemId, name: entry.name, count: Number.isFinite(entry.count) && entry.count > 0 ? entry.count : null })
  return {
    recipeId: expected.recipeId,
    skill: expected.skill,
    titleKo: detail.titleKo,
    ingredients: detail.ingredients.map(({ itemId, name, count }) => ({ itemId, name, count })),
    baseOutputs: baseOutputs.map(normalizeOutput),
    randomOutputs: randomOutputs.map(normalizeOutput),
    sourceUrl,
    available: true,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const catalog = JSON.parse(await readFile(args.catalog, 'utf8'))
  const expected = catalogRecipeEntries(catalog)
  const browser = await chromium.launch({ headless: true })
  const recipes = []
  try {
    const context = await browser.newContext({ locale: 'ko-KR' })
    const page = await context.newPage()
    page._detailTimeoutMs = args.timeoutMs
    for (const entry of expected) {
      recipes.push(await extractRecipe(page, entry))
      console.log(`${entry.skill}:${entry.recipeId} captured`)
    }
    await context.close()
  } finally {
    await browser.close()
  }
  assertExactCatalogCoverage(expected, recipes)
  const result = {
    schemaVersion: 1,
    source: 'BDO Codex KR recipe pages',
    catalogCollectedAt: catalog.collectedAt,
    collectedAt: new Date().toISOString(),
    complete: true,
    expectedRecipeCount: expected.length,
    recipeCount: recipes.length,
    recipes,
  }
  await mkdir(dirname(args.out), { recursive: true })
  await writeFile(args.out, JSON.stringify(result, null, 2) + '\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1) })
}
