# Release E2E evidence manifest

`docs/E2E-ACCEPTANCE.md` defines the nine release-blocking user scenarios. A release must preserve their results as a machine-checkable JSON manifest instead of relying on prose or CI success alone.

Start from `docs/RELEASE-E2E-EVIDENCE.example.json`, replace every placeholder with evidence from the exact release candidate, and run:

```bash
npm run e2e:release-evidence -- <release-e2e-evidence.json>
```

The validator fails closed unless the manifest binds all of the following: exact 40-character release commit, promoted dataset fingerprint, reconciliation fingerprint and timestamp, exact production `mastery.json` SHA-256, mastery-evidence fingerprint, at least one concrete browser, exact positive width/height for both desktop and narrow viewports, keyboard-only primary controls, and exactly `E2E-01` through `E2E-09` with `PASS` plus a durable evidence pointer for each scenario. Placeholder/TODO/all-zero identity values are rejected.

Each scenario evidence pointer must be either an HTTPS URL or an existing file path relative to the manifest. Local paths are existence-checked at validation time; plain labels and missing files are rejected. This lets a release bundle carry local Playwright traces/screenshots while also supporting durable CI/artifact links.

The final production gate requires this manifest as its sixth artifact and additionally compares `mainCommit` against `git rev-parse HEAD`:

```bash
npm run data:release-gate -- \
  public/data/dataset.json \
  <reconciliation-report.json> \
  <codex-catalog.json> \
  <mastery-evidence.json> \
  <mastery.json> \
  <release-e2e-evidence.json>
```

A manifest can therefore document work in progress, but it cannot make a different commit release-ready and it cannot turn missing production data/evidence into a pass.
