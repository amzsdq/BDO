export function validateCatalogEndpointTemplate(template) {
  const value = String(template || '').trim()
  if (!value) return { ok: false, reason: 'catalog endpoint template is required' }
  if (!value.includes('{skill}')) return { ok: false, reason: 'catalog endpoint template must bind the requested skill with {skill}' }
  let parsed
  try { parsed = new URL(value.replace('{skill}', 'cooking')) } catch { return { ok: false, reason: 'catalog endpoint template must be an absolute URL' } }
  if (parsed.hostname !== 'bdocodex.com' && parsed.hostname !== 'www.bdocodex.com') return { ok: false, reason: 'catalog endpoint must be hosted by bdocodex.com' }
  const scope = `${parsed.pathname}?${parsed.searchParams.toString()}`.toLowerCase()
  if (parsed.searchParams.has('item_id') || parsed.searchParams.get('type') === 'product' || /(?:^|[?&])item_id=/.test(scope)) return { ok: false, reason: 'product/item-scoped Codex endpoints cannot prove complete Cooking/Alchemy catalogs' }
  return { ok: true, reason: null }
}
