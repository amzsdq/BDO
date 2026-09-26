# Release E2E evidence manifest

`docs/E2E-ACCEPTANCE.md` defines the nine release-blocking user scenarios. A release must preserve their results as a machine-checkable JSON manifest instead of relying on prose or CI success alone.

Start from `docs/RELEASE-E2E-EVIDENCE.example.json`, replace every placeholder with evidence from the exact release candidate, and run:

```bash
npm run e2e:release-evidence -- <release-e2e-evidence.json>
```

The validator fails closed unless the manifest binds all of the following: exact 40-character release commit, promoted dataset fingerprint, reconciliation artifact SHA-256 plus its exact `generatedAt`, exact production `mastery.json` SHA-256, mastery-evidence artifact SHA-256, exact production `icon-manifest.json` SHA-256, at least one concrete browser, exact positive width/height for both desktop and narrow viewports, and exactly `E2E-01` through `E2E-09` with `PASS`, every declared browser, desktop+narrow coverage, keyboard-only primary-control PASS, a durable evidence pointer, and a SHA-256 content identity for each scenario. Placeholder/TODO/all-zero identity values are rejected. Global browser/viewport/keyboard declarations do not substitute for scenario-level coverage.

Each scenario evidence pointer must be either an HTTPS URL or an existing file path relative to the manifest. Local paths must stay inside the manifest directory: absolute paths, `..` traversal, and symlinks resolving outside that directory are rejected. Accepted local files are existence-checked and their bytes are hashed at validation time; a hash mismatch fails the gate. HTTPS evidence must still record `evidenceSha256` so the preserved artifact has an immutable content identity even when the validator cannot fetch the remote object. Plain labels, insecure HTTP URLs, missing files, and missing hashes are rejected.

The final production gate requires this E2E manifest together with six data/mastery evidence artifacts: promoted dataset, reconciliation report, independently complete Codex catalog, exact Codex detail manifest, mastery evidence, and the exact mastery snapshot. The Codex detail bytes are hash-bound through reconciliation and promoted metadata, and the release dataset gate also rejects any reviewed retired crafting route that survives in the final dataset. The gate compares `mainCommit` against `git rev-parse HEAD` and cross-checks all bound fingerprints against the exact artifacts supplied in the same invocation, including the canonical icon manifest beside the promoted dataset:

```bash
npm run data:release-gate -- \
  public/data/dataset.json \
  <reconciliation-report.json> \
  <codex-catalog.json> \
  <codex-details.json> \
  <mastery-evidence.json> \
  <mastery.json> \
  <release-e2e-evidence.json>
```

A manifest can therefore document work in progress, but it cannot make a different commit or a different production-data snapshot release-ready, and it cannot turn missing production data/evidence into a pass.
