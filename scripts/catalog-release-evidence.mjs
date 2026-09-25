import { normalizeExpectedCountEvidence } from './catalog-count-evidence.mjs'
import { validateCapturedCatalogRequest, validateResolvedCatalogEndpoint } from './codex-catalog-endpoint.mjs'

export function validateCatalogEntryEvidence(entry, skill) {
  if (!entry || entry.complete !== true || !Number.isSafeInteger(entry.recipeCount) || entry.recipeCount <= 0) return { ok: false, reason: `Codex ${skill} catalog completeness is not proven` }
  if (!entry.endpointUsed || !entry.endpointEvidence) return { ok: false, reason: `Codex ${skill} catalog lacks endpoint evidence` }
  const configuredScope = entry.endpointRequest ? validateCapturedCatalogRequest(entry.endpointUsed, entry.endpointRequest, skill) : validateResolvedCatalogEndpoint(entry.endpointUsed, skill)
  const finalScope = entry.endpointRequest ? validateCapturedCatalogRequest(entry.endpointFinalUrl || entry.endpointUsed, entry.endpointRequest, skill) : validateResolvedCatalogEndpoint(entry.endpointFinalUrl || entry.endpointUsed, skill)
  if (!configuredScope.ok || !finalScope.ok) return { ok: false, reason: `Codex ${skill} catalog endpoint scope is invalid` }
  const endpointCountMatches = entry.endpointEvidence.recordsReported === entry.recipeCount
  const fullArrayTransportMatches = entry.endpointEvidence.completenessMode === 'unpaginated-full-array+rendered-id-crosscheck' && entry.endpointEvidence.requestPaginationParametersPresent === false && entry.endpointEvidence.fullArrayRows === entry.recipeCount && entry.endpointEvidence.renderedRecipeIds === entry.recipeCount
  const expectedEvidence = normalizeExpectedCountEvidence({ [skill]: entry.expectedCountEvidence }, skill)
  const independentCountMatches = entry.countMatchesExpected === true && expectedEvidence?.valid === true && expectedEvidence.count === entry.recipeCount
  if (!endpointCountMatches && !fullArrayTransportMatches && !independentCountMatches) return { ok: false, reason: `Codex ${skill} catalog lacks auditable completeness evidence` }
  return { ok: true }
}
