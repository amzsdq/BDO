import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
const root=path.resolve(process.argv[2]||'')
if(!root||!fs.existsSync(root)||!fs.statSync(root).isDirectory()){console.error('icon tree hash blocked: directory required');process.exit(1)}
const files=[]
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(e.isFile())files.push(f);else{console.error('icon tree hash blocked: unsupported entry');process.exit(1)}}}
walk(root);files.sort((a,b)=>path.relative(root,a).replaceAll('\\','/').localeCompare(path.relative(root,b).replaceAll('\\','/')))
const h=crypto.createHash('sha256')
for(const f of files){h.update(path.relative(root,f).replaceAll('\\','/'));h.update('\0');h.update(fs.readFileSync(f));h.update('\0')}
process.stdout.write(h.digest('hex')+'\n')
