function parseAndValidateResolvedCodexUrl(value) {
  let parsed
  try { parsed = new URL(String(value || '').trim()) } catch { return { ok: false, reason: 'catalog endpoint must be an absolute URL', parsed: null, params: null } }
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'catalog endpoint must use HTTPS', parsed, params: null }
  const host = parsed.hostname.toLowerCase()
  if (host !== 'bdocodex.com' && host !== 'www.bdocodex.com') return { ok: false, reason: 'catalog endpoint must be hosted by bdocodex.com', parsed, params: null }
  if (!parsed.pathname.toLowerCase().endsWith('/query.php')) return { ok: false, reason: 'catalog endpoint must use the Codex query.php recipe transport', parsed, params: null }
  const params = new Map([...parsed.searchParams.entries()].map(([key, child]) => [key.toLowerCase(), child.toLowerCase()]))
  if (params.get('a') !== 'recipes') return { ok: false, reason: 'catalog endpoint must use a=recipes', parsed, params }
  if (params.has('item_id') || params.get('type') === 'product') return { ok: false, reason: 'product/item-scoped Codex endpoints cannot prove complete Cooking/Alchemy catalogs', parsed, params }
  return { ok: true, reason: null, parsed, params }
}

function validateSkillScope(params, skill) {
  if (!skill) return { ok: true, reason: null }
  const normalizedSkill = String(skill).toLowerCase()
  const expectedType = normalizedSkill === 'cooking' ? 'culinary' : normalizedSkill
  if (params?.get('skill') === normalizedSkill || params?.get('type') === expectedType) return { ok: true, reason: null }
  return { ok: false, reason: `catalog endpoint must remain scoped to ${normalizedSkill}` }
}

export function validateCatalogEndpointTemplate(template) {
  const value = String(template || '').trim()
  if (!value) return { ok: false, reason: 'catalog endpoint template is required' }
  if (!value.includes('{skill}') && !value.includes('{category}')) return { ok: false, reason: 'catalog endpoint template must bind the requested skill with {skill} or {category}' }
  const resolved = value.replaceAll('{skill}', 'cooking').replaceAll('{category}', 'culinary')
  const base = parseAndValidateResolvedCodexUrl(resolved)
  if (!base.ok) return { ok: false, reason: base.reason }
  return validateSkillScope(base.params, 'cooking')
}

export function validateResolvedCatalogEndpoint(url, expectedSkill = null) {
  const base = parseAndValidateResolvedCodexUrl(url)
  if (!base.ok) return { ok: false, reason: base.reason }
  return validateSkillScope(base.params, expectedSkill)
}

export function catalogEndpointForSkill(template, skill) {
  const category = skill === 'cooking' ? 'culinary' : skill
  return String(template).replaceAll('{skill}', skill).replaceAll('{category}', category)
}
