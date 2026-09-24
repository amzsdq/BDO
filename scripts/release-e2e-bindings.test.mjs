import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { assertReleaseE2eBindings } from './release-e2e-bindings.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const reconciliationBytes = Buffer.from('{"generatedAt":"2026-09-24T00:00:00Z"}');
const masteryEvidenceBytes = Buffer.from('mastery-evidence');
const masteryBytes = Buffer.from('mastery');
const base = {
  evidence: {
    mainCommit: 'a'.repeat(40),
    datasetFingerprint: 'dataset-fp',
    reconciliationFingerprint: sha(reconciliationBytes),
    reconciliationTimestamp: '2026-09-24T00:00:00Z',
    masteryEvidenceFingerprint: sha(masteryEvidenceBytes),
    masterySha256: sha(masteryBytes),
  },
  dataset: { metadata: { fingerprint: 'dataset-fp' } },
  reconciliation: { generatedAt: '2026-09-24T00:00:00Z' },
  reconciliationBytes,
  masteryEvidenceBytes,
  masteryBytes,
  head: 'a'.repeat(40),
};
assert.doesNotThrow(() => assertReleaseE2eBindings(base));
for (const mutate of [
  (v) => { v.head = 'b'.repeat(40); },
  (v) => { v.dataset.metadata.fingerprint = 'other'; },
  (v) => { v.reconciliationBytes = Buffer.from('changed'); },
  (v) => { v.reconciliation.generatedAt = '2026-09-25T00:00:00Z'; },
  (v) => { v.masteryEvidenceBytes = Buffer.from('changed'); },
  (v) => { v.masteryBytes = Buffer.from('changed'); },
]) {
  const candidate = structuredClone(base);
  mutate(candidate);
  assert.throws(() => assertReleaseE2eBindings(candidate));
}
console.log('release-e2e-bindings tests PASS');
