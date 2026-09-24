import { readFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8')
const acceptance = await readFile(new URL('../docs/E2E-ACCEPTANCE.md', import.meta.url), 'utf8')
const productionGate = await readFile(new URL('./assert-production-release.mjs', import.meta.url), 'utf8')
const evidenceGate = await readFile(new URL('./assert-e2e-release-evidence.mjs', import.meta.url), 'utf8')

const failures = []
const e2eScript = pkg.scripts?.e2e
const e2eCiScript = pkg.scripts?.['e2e:ci']
const releaseEvidenceScript = pkg.scripts?.['e2e:release-evidence']

if (!e2eScript) failures.push('package.json must expose an e2e script')
if (!e2eCiScript) failures.push('package.json must expose an e2e:ci script')
if (!releaseEvidenceScript) failures.push('package.json must expose an e2e:release-evidence script')
if (!/@playwright\/test/.test(JSON.stringify(pkg.devDependencies ?? {}))) failures.push('@playwright/test must be a devDependency')
if (!/npm run e2e:ci/.test(workflow)) failures.push('CI must execute npm run e2e:ci')
if (!/assert-e2e-release-evidence\.mjs/.test(productionGate)) failures.push('production release gate must execute the E2E evidence validator')
if (!/mainCommit/.test(productionGate) || !/rev-parse/.test(productionGate)) failures.push('production release gate must bind E2E evidence to exact git HEAD')

for (let i = 1; i <= 9; i += 1) {
  const id = `E2E-${String(i).padStart(2, '0')}`
  if (!acceptance.includes(id)) failures.push(`acceptance contract missing ${id}`)
  if (!evidenceGate.includes('E2E-') || !evidenceGate.includes('scenario')) failures.push('release evidence validator must enforce scenario coverage')
}

if (failures.length) {
  console.error('E2E_HARNESS_NOT_READY')
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('E2E_HARNESS_READY')
