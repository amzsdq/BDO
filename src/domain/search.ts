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
