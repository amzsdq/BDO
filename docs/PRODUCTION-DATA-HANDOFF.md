# Production data handoff

The remaining completeness work cannot be satisfied by synthetic fixtures. The canonical structural snapshot must come from a legally installed, current Black Desert client using the reviewed `iDevelopThings/bdo-data-extractor` contract (v0.1.9 or newer), or an equivalently provenance-preserving extraction.

## Required local-client bundle

Preserve these files from one extraction run together:

- `items.json`
- `recipes.json`
- `mastery.json`
- `asset_redirects.json` plus `icons/` (the extractor's shared WebP assets; `urn::item:<id>` redirects identify which shared asset belongs to each item ID)
- extraction provenance: exact extractor tag/commit, extraction timestamp, client/game fingerprint (required), and region/client identity

Do not mix `items.json`, `recipes.json`, `mastery.json`, or icons from different client snapshots. `clientFingerprint` is mandatory for structural import, mastery evidence, promotion, and the final release gate; a snapshot without it is not production-ready.

## Recommended extraction

Preferred Windows path:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-production-data.ps1
```

The bootstrap attempts to find common Pearl Abyss / Steam installs (including Steam libraryfolders), installs the reviewed extractor revision, runs `build` and `icons`, hashes same-snapshot `items.json` / `recipes.json` / `mastery.json`, fingerprints the installed client, imports the planner-scoped structural dataset, and creates mastery cross-check evidence. If automatic discovery fails, provide `-GameDir '<installed Black Desert directory>'`.

Manual equivalent:

```text
bdo-data-extractor build --game <BDO_GAME_DIR> --out <OUT_DIR>
bdo-data-extractor icons --game <BDO_GAME_DIR> --out <OUT_DIR>
```

Record the exact extractor revision used. A source checkout alone is not production data evidence; the extractor must run against the installed client.

The companion `bdo-viewer` remains an alternative acquisition path because it runs the extractor locally and stores its generated dataset under the OS cache directory. If that route is used, still record the bundled extractor revision and keep all artifacts from the same extraction snapshot.

## Planner-side processing order

1. Import the scoped Cooking/Alchemy structural graph with an explicit source revision. The structural importer intentionally starts recipe yields as `unknown-server-yield` 1/1 placeholders; these are not release evidence.
2. Apply BDO Codex KR Korean-name evidence for every planner-scoped item.
3. Collect schema-v2 Codex recipe details for the complete skill-scoped catalog and bind every selectable planner variant to exactly one source route. `single-base` routes require exact base-output identity and bounded yield; `random-only` and `no-output` remain explicit non-deterministic classifications. Ambiguous, unresolved, multiple-base, unavailable, or uncovered selectable routes fail closed.
4. Install the exact item-id icon assets referenced by the imported dataset.
5. Collect complete KR Codex Cooking and Alchemy catalog evidence. Prefer `npm run data:codex:browser -- --out <codex-catalog.json>`, which opens the real catalog pages, captures their live skill-scoped XHR transport, and paginates until the unique recipe-id set equals the server-reported total. The scheduled `production-data-evidence` workflow performs the same capture in GitHub Actions.
6. Reconcile the imported client graph against the complete Codex catalog until the report is `ZERO_UNEXPLAINED_DIFF` with no unexplained recipe-id/count gap.
7. Prepare mastery evidence from the matching `mastery.json` using the same extraction provenance.
8. Promote the dataset only after the data gates pass.
9. Run real browser E2E-01..09 against that exact promoted dataset/release commit on every declared browser, desktop+narrow, and keyboard-only primary controls. Preserve content-hashed evidence for each scenario and create `release-e2e-evidence.json` per `docs/RELEASE-E2E-EVIDENCE.md`.
10. Run the final six-artifact production release gate. It revalidates the data/mastery gates and binds the E2E manifest to the exact release HEAD and exact production artifacts.

## Standard commands

```text
npm run data:import -- --items <items.json> --recipes <recipes.json> --out <client-dataset.json> --source-revision <extractor-tag-or-sha> --client-fingerprint <client-fingerprint>
node scripts/apply-korean-name-evidence.mjs <client-dataset.json> <korean-name-evidence.json> public/data/dataset.json
npm run data:codex:details -- --catalog <codex-catalog.json> --out <codex-details.json>
npm run data:codex:items -- --items <exact-scoped-item-ids> --out <codex-item-evidence.json>
npm run data:codex:bind -- public/data/dataset.json <codex-details.json> <bound-yield-evidence.json> <codex-item-evidence.json>
npm run data:yields -- public/data/dataset.json <bound-yield-evidence.json> public/data/dataset.json
npm run data:icons -- public/data/dataset.json <extractor-data> public/icons
npm run data:validate -- public/data/dataset.json
npm run data:codex:browser -- --out <codex-catalog.json>
npm run data:reconcile -- --dataset public/data/dataset.json --codex <codex-manifest.json> --out <reconciliation-report.json>
npm run data:mastery-evidence -- --mastery <mastery.json> --out <mastery-evidence.json> --source-revision <extractor-tag-or-sha> --client-fingerprint <client-fingerprint> --extracted-at <iso-timestamp>
npm run data:promote -- public/data/dataset.json <reconciliation-report.json> <codex-catalog.json>
# Run production E2E-01..09 now and preserve release-e2e-evidence.json.
npm run e2e:release-evidence -- <release-e2e-evidence.json>
npm run data:release-gate -- public/data/dataset.json <reconciliation-report.json> <codex-catalog.json> <mastery-evidence.json> <mastery.json> <release-e2e-evidence.json>
```

## Fail-closed rules

Do not declare production completeness when any of the following is true:

- the extraction revision is unrecorded;
- artifacts come from mixed client snapshots;
- Korean-name evidence does not cover every planner-scoped item;
- every selectable Cooking/Alchemy variant lacks exact source binding and explicit output classification, or a deterministic single-base route lacks bounded yield evidence;
- any canonical local icon is missing;
- Codex catalog completeness is not independently demonstrated;
- reconciliation has an unexplained diff;
- mastery evidence is not bound to the exact `mastery.json` bytes;
- any E2E-01..09 scenario lacks content-hashed evidence on every declared browser, desktop+narrow, or keyboard-only primary controls;
- the E2E manifest is not bound to the exact release commit and exact production data/mastery/reconciliation artifacts.
