# Production data handoff

Production completeness requires a current, legally installed KR Black Desert client snapshot plus independently captured KR web evidence. Synthetic fixtures are regression inputs only.

## Same-snapshot client bundle

Keep these together from one extraction:
- `items.json`, `recipes.json`, `mastery.json`
- `asset_redirects.json` and decoded `icons/`
- exact extractor commit, extraction timestamp, mandatory `clientFingerprint`, and KR client identity

Do not mix snapshots. The reviewed extractor revision is pinned in `scripts/bootstrap-production-data.ps1`; a source checkout without running it against the installed client is not production evidence.

## Evidence-first processing order

1. Extract client data/icons and provenance. For direct bootstrap snapshots, immediately run `node scripts/seal-snapshot-icon-provenance.mjs <snapshot-dir>` before downstream prepare or icon installation.
2. Broad-import all Cooking/Alchemy routes with `data:import:broad` into `client-broad.json`. Do not scope-prune yet.
3. Capture independently complete KR Codex Cooking/Alchemy catalogs.
4. Capture schema-v2 details with bounded catalog-gap discovery and reviewed route-state evidence. Current reviewed evidence retires historical spirit-stone crafting routes 342–346 per the official KR PC 2026-09-02 update; stale Codex detail pages must not restore them.
5. Prune reviewed retired crafting outputs and any variant consuming a reviewed deleted crafting ingredient from the broad client graph before random-alias normalization or source binding; preserve unrelated variants for the same output.
6. Collect initial exact item evidence from the complete detail artifact, discover material-group IDs, and collect group evidence.
7. Normalize markerless random-output aliases, bind exact Codex detail evidence, then apply reviewed yield evidence. Random-only/unavailable routes are not forced into a positive base-yield contract.
8. Apply substitution evidence and finalize planner scope without re-importing the client graph.
9. Collect a second exact item-evidence pass for the final scoped item set, then apply Korean names/weights/mastery enrichment.
10. Install canonical WebP icons and verify `icon-manifest.json` bytes, per-file SHA-256, exact item set, and deterministic set hash.
11. Validate, reconcile against the exact catalog/details artifacts, prepare same-snapshot mastery evidence, and promote only at `ZERO_UNEXPLAINED_DIFF`; standard promotion rechecks the icon manifest's actual WebP bytes/SHA-256 and its dataset client-fingerprint/redirect/icon-tree source provenance before writing `COMPLETE_VERIFIED`.
12. Run production E2E-01..09 against the exact promoted dataset and release commit, then run the final production release gate.

The exact Codex detail artifact bytes are SHA-256 bound through reconciliation and promoted metadata into the final release gate. Reviewed retired-route evidence is embedded in that detail artifact; a promotion/final dataset that still contains one of its retired crafting outputs or consumes a reviewed deleted crafting ingredient must be rejected.

## Core commands

```text
node scripts/seal-snapshot-icon-provenance.mjs <bootstrap-snapshot-dir>
node scripts/prepare-client-broad-from-snapshot.mjs <bootstrap-snapshot-dir> <client-broad.json>
# Equivalent manual primitive when starting from separately verified raw files:
npm run data:import:broad -- --items <items.json> --recipes <recipes.json> --out <client-broad.json> --source-revision <exact-extractor-sha> --client-fingerprint <sha256:...>
npm run data:codex:browser -- --out <codex-catalog.json>
npm run data:codex:details:reviewed -- --catalog <codex-catalog.json> --route-state-evidence data/evidence/retired-crafting-routes.kr.json --out <codex-details.json>
npm run data:retired:prune -- <client-broad.json> data/evidence/retired-crafting-routes.kr.json <client-live.json>
npm run data:codex:items -- --details <codex-details.json> --out <initial-item-evidence.json>
npm run data:codex:normalize-random -- <client-live.json> <codex-details.json> <normalized.json>
npm run data:codex:bind -- <normalized.json> <codex-details.json> <bound-yield-evidence.json> <initial-item-evidence.json>
npm run data:yields -- <normalized.json> <bound-yield-evidence.json> <yielded.json>
npm run data:scope:finalize -- <yielded.json> <scoped.json> <substitution-evidence.json>
npm run data:codex:items -- --dataset <scoped.json> --out <final-item-evidence.json>
npm run data:names-ko -- <scoped.json> <final-item-evidence.json> public/data/dataset.json
npm run data:icons -- public/data/dataset.json <extractor-data> public/icons
npm run data:icons:verify -- public/data/dataset.json public/icons/icon-manifest.json public/icons
npm run data:validate -- public/data/dataset.json
```

Use the current README/package scripts for the exact reconcile/promote/release-gate argument list; those gates require the exact Codex catalog and detail artifacts in addition to mastery and E2E evidence.

## Fail-closed rules

Do not declare production completeness if the extractor/client fingerprint is missing, artifacts are mixed across snapshots, reviewed retired routes survive in the dataset, bounded supplemental discovery is incomplete, exact item/name/yield/substitution evidence is incomplete, icon bytes/manifest fail verification, reconciliation is not `ZERO_UNEXPLAINED_DIFF`, mastery evidence is not same-snapshot, or any required production E2E/release binding is absent.

The Windows bootstrap still emits legacy scoped `client-dataset.json`, but it also preserves same-snapshot raw `items.json`/`recipes.json` plus hashed `provenance.json`. Immediately run `prepare-client-broad-from-snapshot.mjs` on that snapshot and use its verified `client-broad.json`; do not use the legacy scoped dataset as the evidence-first entry point.
