import { createHash } from 'node:crypto';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function assertReleaseE2eBindings({ evidence, dataset, reconciliation, reconciliationBytes, codexManifestBytes, masteryEvidenceBytes, masteryBytes, head }) {
  if (evidence.mainCommit !== head) throw new Error(`E2E evidence mainCommit ${evidence.mainCommit} does not match release HEAD ${head}`);
  if (evidence.datasetFingerprint !== dataset.metadata?.fingerprint) throw new Error('E2E evidence datasetFingerprint does not match promoted dataset');
  if (evidence.reconciliationFingerprint !== sha256(reconciliationBytes)) throw new Error('E2E evidence reconciliationFingerprint does not match reconciliation artifact SHA-256');
  if (evidence.reconciliationTimestamp !== reconciliation.generatedAt) throw new Error('E2E evidence reconciliationTimestamp does not match reconciliation generatedAt');
  if (evidence.codexManifestSha256 !== sha256(codexManifestBytes)) throw new Error('E2E evidence codexManifestSha256 does not match exact Codex detail manifest bytes');
  if (evidence.masteryEvidenceFingerprint !== sha256(masteryEvidenceBytes)) throw new Error('E2E evidence masteryEvidenceFingerprint does not match mastery-evidence artifact SHA-256');
  if (evidence.masterySha256 !== sha256(masteryBytes)) throw new Error('E2E evidence masterySha256 does not match production mastery.json bytes');
}
