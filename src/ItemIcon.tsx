import { useState } from 'react'
import type { Item } from './domain/types'

export function ItemIcon({ item }: { item: Item | undefined }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const source = item?.iconUrl ?? item?.iconPath
  const canRender = Boolean(source && source !== failedSource)

  return (
    <div className="item-icon">
      {canRender ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(source ?? null)}
        />
      ) : (
        <span aria-hidden="true">?</span>
      )}
    </div>
  )
}
