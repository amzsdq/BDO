import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const file = process.argv[2];
if (!file) throw new Error('usage: node scripts/assert-e2e-release-evidence.mjs <manifest.json>');
const manifestPath = path.resolve(file);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const fail = (message) => { throw new Error(`release E2E evidence rejected: ${message}`); };
const evidenceString = (value) => typeof value === 'string' && value.trim().length > 0 && !/REPLACE|PLACEHOLDER|TODO/i.test(value);
const sha256 = /^[a-f0-9]{64}$/i;
const gitSha = /^[a-f0-9]{40}$/i;
const allZero = (value) => /^0+$/.test(value ?? '');
const localEvidencePath = (value) => /^https:\/\//i.test(value) ? null : path.resolve(path.dirname(manifestPath), value);
const evidencePointerResolves = (value) => {
  if (!evidenceString(value)) return false;
  if (/^https:\/\//i.test(value)) {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }
  return fs.existsSync(localEvidencePath(value));
};
const fileSha256 = (filePath) => createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

if (manifest.schemaVersion !== 1) fail('schemaVersion must be 1');
if (!gitSha.test(manifest.mainCommit ?? '') || allZero(manifest.mainCommit)) fail('mainCommit must be a non-placeholder exact 40-char git SHA');
for (const key of ['datasetFingerprint', 'reconciliationFingerprint', 'masteryEvidenceFingerprint']) {
  if (!evidenceString(manifest[key])) fail(`${key} is required and cannot be a placeholder`);
}
if (!sha256.test(manifest.codexManifestSha256 ?? '') || allZero(manifest.codexManifestSha256)) fail('codexManifestSha256 must be a non-placeholder 64-char SHA-256');
if (!sha256.test(manifest.masterySha256 ?? '') || allZero(manifest.masterySha256)) fail('masterySha256 must be a non-placeholder 64-char SHA-256');
if (!evidenceString(manifest.reconciliationTimestamp)) fail('reconciliationTimestamp is required');
if (Number.isNaN(Date.parse(manifest.reconciliationTimestamp))) fail('reconciliationTimestamp must be ISO-8601 parseable');
if (!Array.isArray(manifest.browsers) || manifest.browsers.length === 0 || manifest.browsers.some((x) => !evidenceString(x))) fail('at least one concrete browser is required');
const requiredBrowsers = new Set(manifest.browsers);
if (!Array.isArray(manifest.viewports)) fail('viewports must be an array');
const viewportLabels = new Set();
for (const viewport of manifest.viewports) {
  if (!viewport || !['desktop', 'narrow'].includes(viewport.label)) fail('viewport label must be desktop or narrow');
  if (!Number.isInteger(viewport.width) || viewport.width <= 0 || !Number.isInteger(viewport.height) || viewport.height <= 0) fail(`${viewport.label} viewport must record positive integer width/height`);
  if (viewportLabels.has(viewport.label)) fail(`duplicate viewport label ${viewport.label}`);
  viewportLabels.add(viewport.label);
}
if (!viewportLabels.has('desktop') || !viewportLabels.has('narrow')) fail('desktop and narrow viewports are both required');
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
  const scenarioBrowsers = new Set(Array.isArray(scenario.browsers) ? scenario.browsers : []);
  if ([...requiredBrowsers].some((browser) => !scenarioBrowsers.has(browser))) fail(`${id} must PASS on every declared browser`);
  const scenarioViewports = new Set(Array.isArray(scenario.viewports) ? scenario.viewports : []);
  if (!scenarioViewports.has('desktop') || !scenarioViewports.has('narrow')) fail(`${id} must PASS on desktop and narrow viewports`);
  if (scenario.keyboardOnly !== true) fail(`${id} must record keyboard-only primary-control PASS`);
  if (!evidencePointerResolves(scenario.evidence)) fail(`${id} evidence must be an existing manifest-relative file or HTTPS URL`);
  if (!sha256.test(scenario.evidenceSha256 ?? '') || allZero(scenario.evidenceSha256)) fail(`${id} evidenceSha256 must be a non-placeholder SHA-256`);
  const localPath = localEvidencePath(scenario.evidence);
  if (localPath && fileSha256(localPath) !== scenario.evidenceSha256.toLowerCase()) fail(`${id} local evidence SHA-256 mismatch`);
}
const extras = [...byId.keys()].filter((id) => !required.includes(id));
if (extras.length) fail(`unknown scenarios: ${extras.join(', ')}`);

console.log(`release E2E evidence PASS: ${required.length}/9 scenarios; main=${manifest.mainCommit}`);
