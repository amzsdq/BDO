import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bdo-e2e-evidence-'));
const file = path.join(tmp, 'manifest.json');
const script = new URL('./assert-e2e-release-evidence.mjs', import.meta.url).pathname;
const base = {
  schemaVersion: 1,
  mainCommit: 'a'.repeat(40),
  datasetFingerprint: 'dataset-fp',
  reconciliationFingerprint: 'reconcile-fp',
  reconciliationTimestamp: '2026-09-24T00:00:00Z',
  masterySha256: 'b'.repeat(64),
  masteryEvidenceFingerprint: 'mastery-fp',
  browsers: ['chromium'],
  viewports: [{ label: 'desktop', width: 1440, height: 900 }, { label: 'narrow', width: 390, height: 844 }],
  keyboardOnlyPrimaryControls: true,
  scenarios: Array.from({ length: 9 }, (_, i) => ({ id: `E2E-${String(i + 1).padStart(2, '0')}`, status: 'PASS', evidence: `https://evidence.invalid/e2e-${i + 1}` })),
};
const run = (value) => {
  fs.writeFileSync(file, JSON.stringify(value));
  return execFileSync(process.execPath, [script, file], { encoding: 'utf8' });
};
assert.match(run(base), /9\/9 scenarios/);
const localEvidence = path.join(tmp, 'e2e-01.zip');
fs.writeFileSync(localEvidence, 'fixture');
const local = structuredClone(base);
local.scenarios[0].evidence = 'e2e-01.zip';
assert.match(run(local), /9\/9 scenarios/);
for (const mutate of [
  (m) => { m.scenarios[4].status = 'FAIL'; },
  (m) => { m.scenarios.pop(); },
  (m) => { m.viewports = [{ label: 'desktop', width: 1440, height: 900 }]; },
  (m) => { m.viewports[1].width = 0; },
  (m) => { m.keyboardOnlyPrimaryControls = false; },
  (m) => { m.masterySha256 = 'not-a-sha'; },
  (m) => { m.mainCommit = '0'.repeat(40); },
  (m) => { m.datasetFingerprint = 'REPLACE_WITH_DATASET'; },
  (m) => { m.scenarios[0].evidence = 'TODO'; },
  (m) => { m.scenarios[0].evidence = 'missing-artifact.zip'; },
  (m) => { m.scenarios[0].evidence = 'http://insecure.invalid/evidence'; },
]) {
  const candidate = structuredClone(base);
  mutate(candidate);
  fs.writeFileSync(file, JSON.stringify(candidate));
  assert.throws(() => execFileSync(process.execPath, [script, file], { stdio: 'pipe' }));
}
console.log('assert-e2e-release-evidence tests PASS');
