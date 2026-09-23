export function recipeIdsFromJson(value, { allowCodexAaData = false } = {}) {
  const ids = new Set()
  const addRecipeId = (value) => {
    const id = Number(value)
    if (Number.isSafeInteger(id) && id > 0) ids.add(id)
  }
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    for (const [key, child] of Object.entries(node)) {
      if (/^recipe_?id$/i.test(key)) addRecipeId(child)
      if (allowCodexAaData && key === 'aaData' && Array.isArray(child)) {
        for (const row of child) if (Array.isArray(row) && row.length > 0) addRecipeId(row[0])
      }
      if (typeof child === 'string') {
        for (const match of child.matchAll(/\/kr\/recipe\/(\d+)\//g)) addRecipeId(match[1])
      }
      visit(child)
    }
  }
  visit(value)
  return [...ids].sort((a, b) => a - b)
}
