export function recipeIdsFromJson(value) {
  const ids = new Set()
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    for (const [key, child] of Object.entries(node)) {
      if (/^recipe_?id$/i.test(key) && Number.isSafeInteger(Number(child))) ids.add(Number(child))
      if (typeof child === 'string') {
        for (const match of child.matchAll(/\/kr\/recipe\/(\d+)\//g)) ids.add(Number(match[1]))
      }
      visit(child)
    }
  }
  visit(value)
  return [...ids].sort((a, b) => a - b)
}
