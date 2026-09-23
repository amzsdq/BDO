export function parseOptionalNonNegativeFinite(raw: string): number | undefined {
  if (raw === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

export function parseNonNegativeFiniteOrZero(raw: string): number {
  return parseOptionalNonNegativeFinite(raw) ?? 0
}
