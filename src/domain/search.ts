import type { Item, Recipe, RecipeDataset } from './types'

const CHOSEONG = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
] as const

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(/[\s\-_'".·・()[\]{}]/g, '')
}

export function choseong(value: string): string {
  let out = ''
  for (const char of value.normalize('NFC')) {
    const code = char.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHOSEONG[Math.floor((code - 0xac00) / 588)]
    } else if (/^[ㄱ-ㅎ]$/.test(char)) {
      out += char
    }
  }
  return out
}

function boundedEditDistance(a: string, b: string, maxDistance: number): number | null {
  if (Math.abs(a.length - b.length) > maxDistance) return null
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    let rowMin = current[0]
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      rowMin = Math.min(rowMin, current[j])
    }
    if (rowMin > maxDistance) return null
    previous = current
  }
  return previous[b.length] <= maxDistance ? previous[b.length] : null
}

function fuzzyContainsDistance(name: string, query: string, maxDistance: number): number | null {
  let best: number | null = null
  const minLength = Math.max(1, query.length - maxDistance)
  const maxLength = Math.min(name.length, query.length + maxDistance)
  for (let length = minLength; length <= maxLength; length += 1) {
    for (let start = 0; start + length <= name.length; start += 1) {
      const distance = boundedEditDistance(name.slice(start, start + length), query, maxDistance)
      if (distance != null && (best == null || distance < best)) best = distance
      if (best === 0) return 0
    }
  }
  return best
}

function scoreName(name: string, query: string): number | null {
  const normalizedName = normalizeSearchText(name)
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return null

  if (normalizedName === normalizedQuery) return 1000
  if (normalizedName.startsWith(normalizedQuery)) return 800 - normalizedName.length
  const index = normalizedName.indexOf(normalizedQuery)
  if (index >= 0) return 600 - index * 4 - normalizedName.length

  const initials = choseong(name)
  const queryInitials = choseong(query) || query.replace(/\s/g, '')
  if (queryInitials && initials.startsWith(queryInitials)) return 500 - initials.length
  const initialIndex = initials.indexOf(queryInitials)
  if (queryInitials && initialIndex >= 0) return 400 - initialIndex * 4 - initials.length

  if (normalizedQuery.length >= 3) {
    const maxDistance = normalizedQuery.length >= 6 ? 2 : 1
    const distance = fuzzyContainsDistance(normalizedName, normalizedQuery, maxDistance)
    if (distance != null) return 300 - distance * 40 - normalizedName.length
  }

  return null
}

export interface RecipeSearchResult {
  recipe: Recipe
  item: Item
  score: number
}

export function searchRecipes(
  dataset: RecipeDataset,
  query: string,
  options: { skill?: 'cooking' | 'alchemy'; limit?: number } = {},
): RecipeSearchResult[] {
  if (!query.trim()) return []

  const results: RecipeSearchResult[] = []
  for (const recipe of Object.values(dataset.recipes)) {
    if (options.skill && recipe.skill !== options.skill) continue
    const item = dataset.items[String(recipe.outputItemId)]
    if (!item) continue

    const ko = scoreName(item.nameKo, query)
    const en = item.nameEn ? scoreName(item.nameEn, query) : null
    const score = Math.max(ko ?? -Infinity, en == null ? -Infinity : en - 40)
    if (!Number.isFinite(score)) continue
    results.push({ recipe, item, score })
  }

  return results
    .sort((a, b) => b.score - a.score || a.item.nameKo.localeCompare(b.item.nameKo, 'ko'))
    .slice(0, options.limit ?? 20)
}
