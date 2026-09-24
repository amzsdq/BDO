import fs from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('usage: node scripts/assert-e2e-release-evidence.mjs <manifest.json>');
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = (message) => { throw new Error(`release E2E evidence rejected: ${message}`); };
const evidenceString = (value) => typeof value === 'string' && value.trim().length > 0 && !/REPLACE|PLACEHOLDER|TODO/i.test(value);
const sha256 = /^[a-f0-9]{64}$/i;
const gitSha = /^[a-f0-9]{40}$/i;
const allZero = (value) => /^0+$/.test(value ?? '');

if (manifest.schemaVersion !== 1) fail('schemaVersion must be 1');
if (!gitSha.test(manifest.mainCommit ?? '') || allZero(manifest.mainCommit)) fail('mainCommit must be a non-placeholder exact 40-char git SHA');
for (const key of ['datasetFingerprint', 'reconciliationFingerprint', 'masteryEvidenceFingerprint']) {
  if (!evidenceString(manifest[key])) fail(`${key} is required and cannot be a placeholder`);
}
if (!sha256.test(manifest.masterySha256 ?? '') || allZero(manifest.masterySha256)) fail('masterySha256 must be a non-placeholder 64-char SHA-256');
if (!evidenceString(manifest.reconciliationTimestamp)) fail('reconciliationTimestamp is required');
if (Number.isNaN(Date.parse(manifest.reconciliationTimestamp))) fail('reconciliationTimestamp must be ISO-8601 parseable');
if (!Array.isArray(manifest.browsers) || manifest.browsers.length === 0 || manifest.browsers.some((x) => !evidenceString(x))) fail('at least one concrete browser is required');
if (!Array.isArray(manifest.viewports) || !manifest.viewports.includes('desktop') || !manifest.viewports.includes('narrow')) fail('desktop and narrow viewports are both required');
if (manifest.keyboardOnlyPrimaryControls !== true) fail('keyboardOnlyPrimaryControls must be true');

const required = Array.from({ length: 9 }, (_, i) => `E2E-${String(i + 1).padStart(2, '0')}`);
if (!Array.isArray(manifest.scenarios)) fail('scenarios must be an array');
const byId = new Map();
for (const scenario of manifest.scenarios) {
  if (!scenario || !evidenceString(scenario.id)) fail('scenario id is required');
  if (byId.has(scenario.id)) fail(`duplicate scenario ${scenario.id}`);
  byId.set(scenario.id, scenario);
}
for (const id of required) {
  const scenario = byId.get(id);
  if (!scenario) fail(`missing ${id}`);
  if (scenario.status !== 'PASS') fail(`${id} must be PASS`);
  if (!evidenceString(scenario.evidence)) fail(`${id} concrete evidence pointer is required`);
}
const extras = [...byId.keys()].filter((id) => !required.includes(id));
if (extras.length) fail(`unknown scenarios: ${extras.join(', ')}`);

console.log(`release E2E evidence PASS: ${required.length}/9 scenarios; main=${manifest.mainCommit}`);
