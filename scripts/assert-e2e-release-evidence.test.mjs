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
  viewports: ['desktop', 'narrow'],
  keyboardOnlyPrimaryControls: true,
  scenarios: Array.from({ length: 9 }, (_, i) => ({ id: `E2E-${String(i + 1).padStart(2, '0')}`, status: 'PASS', evidence: `artifacts/e2e-${i + 1}.zip` })),
};
const run = (value) => {
  fs.writeFileSync(file, JSON.stringify(value));
  return execFileSync(process.execPath, [script, file], { encoding: 'utf8' });
};
assert.match(run(base), /9\/9 scenarios/);
for (const mutate of [
  (m) => { m.scenarios[4].status = 'FAIL'; },
  (m) => { m.scenarios.pop(); },
  (m) => { m.viewports = ['desktop']; },
  (m) => { m.keyboardOnlyPrimaryControls = false; },
  (m) => { m.masterySha256 = 'not-a-sha'; },
]) {
  const candidate = structuredClone(base);
  mutate(candidate);
  fs.writeFileSync(file, JSON.stringify(candidate));
  assert.throws(() => execFileSync(process.execPath, [script, file], { stdio: 'pipe' }));
}
console.log('assert-e2e-release-evidence tests PASS');
