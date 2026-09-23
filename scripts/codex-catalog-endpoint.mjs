export function validateCatalogEndpointTemplate(template) {
  const value = String(template || '').trim()
  if (!value) return { ok: false, reason: 'catalog endpoint template is required' }
  if (!value.includes('{skill}')) return { ok: false, reason: 'catalog endpoint template must bind the requested skill with {skill}' }
  let parsed
  try { parsed = new URL(value.replace('{skill}', 'cooking')) } catch { return { ok: false, reason: 'catalog endpoint template must be an absolute URL' } }
  if (parsed.protocol !== 'https:') return { ok: false, reason: 'catalog endpoint must use HTTPS' }
  const host = parsed.hostname.toLowerCase()
  if (host !== 'bdocodex.com' && host !== 'www.bdocodex.com') return { ok: false, reason: 'catalog endpoint must be hosted by bdocodex.com' }
  const params = new Map([...parsed.searchParams.entries()].map(([key, child]) => [key.toLowerCase(), child.toLowerCase()]))
  if (params.has('item_id') || params.get('type') === 'product') return { ok: false, reason: 'product/item-scoped Codex endpoints cannot prove complete Cooking/Alchemy catalogs' }
  return { ok: true, reason: null }
}
