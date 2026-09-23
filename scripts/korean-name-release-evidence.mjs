export function assertKoreanNameReleaseEvidence(dataset) {
  const items = dataset?.items || {}
  const metadata = dataset?.metadata || {}
  const evidence = metadata.koreanNameEvidence
  const itemCount = Object.keys(items).length

  if (metadata.koreanNamesVerified !== true) {
    throw new Error('Korean names are not verified for the full dataset')
  }
  if (!evidence || evidence.provider !== 'BDO Codex KR') {
    throw new Error('BDO Codex KR Korean-name evidence is required')
  }
  if (!evidence.collectedAt || Number.isNaN(Date.parse(evidence.collectedAt))) {
    throw new Error('Korean-name evidence collectedAt is invalid')
  }
  if (!Number.isSafeInteger(evidence.count) || evidence.count !== itemCount) {
    throw new Error(`Korean-name evidence count ${evidence?.count ?? 'missing'} does not match dataset item count ${itemCount}`)
  }

  const unresolved = Object.values(items).filter((item) => {
    const name = String(item?.nameKo || '').trim()
    return !name || /^아이템\s*#\d+$/.test(name)
  })
  if (unresolved.length) {
    throw new Error(`${unresolved.length} items have unresolved Korean names`)
  }

  return { provider: evidence.provider, collectedAt: evidence.collectedAt, count: evidence.count }
}
