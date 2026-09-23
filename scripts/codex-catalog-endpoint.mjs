function validateResolvedCodexUrl(value) {
  let parsed
  try { parsed = new URL(String(value || '').trim()) } catch { return { ok: false, reason: 'catalog endpoint must be an absolute URL' } }
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'catalog endpoint must use HTTPS' }
  const host = parsed.hostname.toLowerCase()
  if (host !== 'bdocodex.com' && host !== 'www.bdocodex.com') return { ok: false, reason: 'catalog endpoint must be hosted by bdocodex.com' }
  if (!parsed.pathname.toLowerCase().endsWith('/query.php')) return { ok: false, reason: 'catalog endpoint must use the Codex query.php recipe transport' }
  const params = new Map([...parsed.searchParams.entries()].map(([key, child]) => [key.toLowerCase(), child.toLowerCase()]))
  if (params.get('a') !== 'recipes') return { ok: false, reason: 'catalog endpoint must use a=recipes' }
  if (params.has('item_id') || params.get('type') === 'product') return { ok: false, reason: 'product/item-scoped Codex endpoints cannot prove complete Cooking/Alchemy catalogs' }
  return { ok: true, reason: null }
}

export function validateCatalogEndpointTemplate(template) {
  const value = String(template || '').trim()
  if (!value) return { ok: false, reason: 'catalog endpoint template is required' }
  if (!value.includes('{skill}') && !value.includes('{category}')) return { ok: false, reason: 'catalog endpoint template must bind the requested skill with {skill} or {category}' }
  return validateResolvedCodexUrl(value.replaceAll('{skill}', 'cooking').replaceAll('{category}', 'culinary'))
}

export function validateResolvedCatalogEndpoint(url) {
  return validateResolvedCodexUrl(url)
}

export function catalogEndpointForSkill(template, skill) {
  const category = skill === 'cooking' ? 'culinary' : skill
  return String(template).replaceAll('{skill}', skill).replaceAll('{category}', category)
}
