import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { assertProductionIconReleaseEvidence } from './production-icon-release-evidence.mjs'

function webp(payload='ok') {
  const body=Buffer.from(payload), pad=body.length%2, riffSize=4+8+body.length+pad
  const b=Buffer.alloc(8+riffSize); b.write('RIFF',0); b.writeUInt32LE(riffSize,4); b.write('WEBP',8); b.write('VP8 ',12); b.writeUInt32LE(body.length,16); body.copy(b,20); return b
}
function fixture() {
  const root=mkdtempSync(join(tmpdir(),'bdo-icon-release-')),data=join(root,'data'),icons=join(root,'icons'); mkdirSync(data); mkdirSync(icons)
  const datasetFile=join(data,'dataset.json'),fp='sha256:'+'a'.repeat(64),dataset={metadata:{clientFingerprint:fp},items:{'1':{id:1,iconPath:'icons/1.webp'}}}; writeFileSync(datasetFile,JSON.stringify(dataset))
  const bytes=webp(),hash=crypto.createHash('sha256').update(bytes).digest('hex'); writeFileSync(join(icons,'1.webp'),bytes)
  const base={schemaVersion:1,algorithm:'sha256',itemCount:1,setHash:crypto.createHash('sha256').update('1:'+hash).digest('hex'),items:[{itemId:1,path:'icons/1.webp',bytes:bytes.length,sha256:hash}]}
  return {datasetFile,dataset,icons,fp,base}
}
describe('production icon release provenance',()=>{
 it('requires icon manifest source client fingerprint to match dataset',()=>{
  const {datasetFile,dataset,icons,fp,base}=fixture()
  writeFileSync(join(icons,'icon-manifest.json'),JSON.stringify({...base,sourceProvenance:{clientFingerprint:'sha256:'+'b'.repeat(64),assetRedirectsSha256:'c'.repeat(64),iconsSnapshotSha256:'d'.repeat(64)}}))
  expect(()=>assertProductionIconReleaseEvidence(datasetFile,dataset)).toThrow(/client fingerprint/)
  writeFileSync(join(icons,'icon-manifest.json'),JSON.stringify({...base,sourceProvenance:{clientFingerprint:fp,assetRedirectsSha256:'c'.repeat(64),iconsSnapshotSha256:'d'.repeat(64)}}))
  expect(assertProductionIconReleaseEvidence(datasetFile,dataset).itemCount).toBe(1)
 })
 it('returns the exact icon manifest byte hash for release E2E binding',()=>{
  const {datasetFile,dataset,icons,fp,base}=fixture()
  const manifest={...base,sourceProvenance:{clientFingerprint:fp,assetRedirectsSha256:'c'.repeat(64),iconsSnapshotSha256:'d'.repeat(64)}}
  const bytes=JSON.stringify(manifest)
  writeFileSync(join(icons,'icon-manifest.json'),bytes)
  const result=assertProductionIconReleaseEvidence(datasetFile,dataset)
  expect(result.manifestSha256).toBe(crypto.createHash('sha256').update(bytes).digest('hex'))
 })
 it('rejects post-manifest WebP mutation',()=>{
  const {datasetFile,dataset,icons,fp,base}=fixture()
  writeFileSync(join(icons,'icon-manifest.json'),JSON.stringify({...base,sourceProvenance:{clientFingerprint:fp,assetRedirectsSha256:'c'.repeat(64),iconsSnapshotSha256:'d'.repeat(64)}}))
  writeFileSync(join(icons,'1.webp'),webp('tampered'))
  expect(()=>assertProductionIconReleaseEvidence(datasetFile,dataset)).toThrow()
 })
})
