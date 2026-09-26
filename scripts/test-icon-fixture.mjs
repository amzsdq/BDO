import crypto from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')
export function writeVerifiedIconFixture(iconRoot, itemIds) {
  mkdirSync(iconRoot, { recursive: true })
  const bytes = Buffer.alloc(22)
  bytes.write('RIFF'); bytes.writeUInt32LE(14, 4); bytes.write('WEBP', 8); bytes.write('VP8 ', 12); bytes.writeUInt32LE(2, 16); bytes.write('ok', 20)
  const fileHash = sha256(bytes)
  const items = [...itemIds].sort((a, b) => a - b).map((itemId) => {
    writeFileSync(join(iconRoot, `${itemId}.webp`), bytes)
    return { itemId, path: `icons/${itemId}.webp`, bytes: bytes.length, sha256: fileHash }
  })
  const setHash = sha256(Buffer.from(items.map((row) => `${row.itemId}:${row.sha256}`).join('\n')))
  writeFileSync(join(iconRoot, 'icon-manifest.json'), JSON.stringify({ schemaVersion: 1, algorithm: 'sha256', itemCount: items.length, setHash, items }))
}
