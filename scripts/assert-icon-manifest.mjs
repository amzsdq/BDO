import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
export function assertIconManifest(dataset, manifest, iconRoot) {
 if (manifest?.schemaVersion!==1||manifest?.algorithm!=='sha256'||!Array.isArray(manifest.items)) throw new Error('icon manifest schema is invalid')
 const ids=Object.values(dataset.items||{}).map(x=>x.id).sort((a,b)=>a-b); const rows=[...manifest.items].sort((a,b)=>a.itemId-b.itemId)
 if (manifest.itemCount!==ids.length||rows.length!==ids.length||rows.some((r,i)=>r.itemId!==ids[i])) throw new Error('icon manifest item set does not exactly match dataset')
 const digest=x=>crypto.createHash('sha256').update(x).digest('hex')
 for(const r of rows){if(r.path!==`icons/${r.itemId}.webp`||!Number.isInteger(r.bytes)||r.bytes<=0||!/^[a-f0-9]{64}$/.test(r.sha256)) throw new Error(`icon manifest row invalid for item ${r.itemId}`);const file=path.join(iconRoot,`${r.itemId}.webp`);if(!fs.existsSync(file)) throw new Error(`icon file missing for item ${r.itemId}`);const bytes=fs.readFileSync(file);if(bytes.length!==r.bytes||digest(bytes)!==r.sha256) throw new Error(`icon file hash mismatch for item ${r.itemId}`)}
 const setHash=digest(Buffer.from(rows.map(r=>`${r.itemId}:${r.sha256}`).join('\n')));if(setHash!==manifest.setHash) throw new Error('icon manifest setHash mismatch'); return {itemCount:ids.length,setHash}
}
if(import.meta.url===`file://${process.argv[1]}`){const [datasetFile,manifestFile,iconRoot]=process.argv.slice(2);if(!datasetFile||!manifestFile||!iconRoot){console.error('icon manifest blocked: usage: node scripts/assert-icon-manifest.mjs <dataset.json> <icon-manifest.json> <icon-root>');process.exit(1)}try{console.log(JSON.stringify({ok:true,...assertIconManifest(JSON.parse(fs.readFileSync(datasetFile,'utf8')),JSON.parse(fs.readFileSync(manifestFile,'utf8')),iconRoot)}))}catch(e){console.error(`icon manifest blocked: ${e.message}`);process.exit(1)}}
