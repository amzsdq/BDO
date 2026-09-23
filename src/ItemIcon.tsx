import { useEffect, useMemo, useState } from 'react'
import type { Item } from './domain/types'

export function ItemIcon({ item }: { item: Item | undefined }) {
  const [failedSources, setFailedSources] = useState<string[]>([])
  const sources = useMemo(() => [...new Set([item?.iconPath, item?.iconUrl].filter((value): value is string => Boolean(value)))], [item?.iconPath, item?.iconUrl])
  const source = sources.find((candidate) => !failedSources.includes(candidate))

  useEffect(() => { setFailedSources([]) }, [item?.id])

  return (
    <div className="item-icon">
      {source ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
          onError={() => setFailedSources((current) => current.includes(source) ? current : [...current, source])}
        />
      ) : (
        <span aria-hidden="true">?</span>
      )}
    </div>
  )
}
