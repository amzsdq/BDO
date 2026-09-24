# Production data handoff

The remaining completeness work cannot be satisfied by synthetic fixtures. The canonical structural snapshot must come from a legally installed, current Black Desert client using the reviewed `iDevelopThings/bdo-data-extractor` contract (v0.1.9 or newer), or an equivalently provenance-preserving extraction.

## Required local-client bundle

Preserve `items.json`, `recipes.json`, `mastery.json`, extractor `icons/`, and extraction provenance from one snapshot. Do not mix artifacts from different client snapshots.

## Recommended extraction

Preferred Windows path:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-production-data.ps1
```

The bootstrap discovers common installs when possible, runs the reviewed extractor, hashes same-snapshot structural/mastery artifacts, fingerprints the client, imports the planner-scoped graph, and prepares mastery evidence. If discovery fails, provide `-GameDir '<installed Black Desert directory>'`.

## Planner-side processing order

1. Import the scoped Cooking/Alchemy structural graph with an explicit source revision. The structural importer deliberately uses `unknown-server-yield` 1/1 placeholders; these are not release evidence.
2. Apply BDO Codex KR Korean-name evidence for every planner-scoped item.
3. Apply reviewed per-recipe yield evidence covering every Cooking/Alchemy recipe. Evidence must provide positive min/max, optional expected within those bounds, and HTTPS provenance. Production promotion fails closed on missing coverage.
4. Install the exact item-id icon assets referenced by the imported dataset.
5. Collect complete KR Codex Cooking and Alchemy catalog evidence with `npm run data:codex:browser -- --out <codex-catalog.json>` or the equivalent scheduled evidence workflow.
6. Reconcile the imported client graph against the complete catalog until `ZERO_UNEXPLAINED_DIFF`.
7. Prepare mastery evidence from the matching `mastery.json` using the same extraction provenance.
8. Run promotion and final release gates.
9. Run real browser end-to-end acceptance against the promoted completeness-verified dataset.

## Standard commands

```text
npm run data:import -- --items <items.json> --recipes <recipes.json> --out <client-dataset.json> --source-revision <extractor-tag-or-sha>
node scripts/apply-korean-name-evidence.mjs <client-dataset.json> <korean-name-evidence.json> public/data/dataset.json
npm run data:yields -- public/data/dataset.json <yield-evidence.json> public/data/dataset.json
npm run data:icons -- public/data/dataset.json <extractor-data>/icons public/icons
npm run data:validate -- public/data/dataset.json
npm run data:codex:browser -- --out <codex-catalog.json>
npm run data:reconcile -- --dataset public/data/dataset.json --codex <codex-manifest.json> --out <reconciliation-report.json>
npm run data:mastery-evidence -- --mastery <mastery.json> --out <mastery-evidence.json> --source-revision <extractor-tag-or-sha> --client-fingerprint <client-fingerprint> --extracted-at <iso-timestamp>
npm run data:promote -- public/data/dataset.json <reconciliation-report.json> <codex-catalog.json>
npm run data:release-gate -- public/data/dataset.json <reconciliation-report.json> <codex-catalog.json> <mastery-evidence.json> <mastery.json>
```

## Fail-closed rules

Do not declare production completeness when extraction provenance is missing/mixed, Korean names or local icons are incomplete, any recipe still lacks reviewed bounded yield evidence, Codex catalog completeness is unproven, reconciliation has unexplained differences, mastery evidence is not bound to the exact snapshot, or the promoted dataset has not passed real browser E2E acceptance.
