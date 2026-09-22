# Recipe data completeness policy

Missing Cooking or Alchemy recipes are a release blocker.

## Source hierarchy

### 1. Live BDO client extraction — canonical structural source

The strongest known completeness path is the installed game client's own recipe data. The open-source `iDevelopThings/bdo-data-extractor` project documents and extracts per-item recipe XMLs into `recipes.json`, with item localization and icons into `items.json`.

RRuleRO/BDO does not vendor that project's implementation or game assets by default. Instead, BDO will provide an importer for its documented JSON output and record the extractor/version/source timestamp in provenance metadata.

This path exists because a manually maintained community list can be stale or incomplete.

### 2. BDO Codex KR — reconciliation/enrichment source

Reconcile the imported Cooking and Alchemy sets against:
- https://bdocodex.com/kr/recipes/culinary/
- https://bdocodex.com/kr/recipes/alchemy/

BDO Codex also provides recipe detail pages and item imagery useful for human verification/enrichment.

Codex recipe-page IDs are provenance identifiers, not canonical recipe identity: locale/region pages can assign different page IDs to the same logical recipe. Reconciliation therefore keys primarily by linked canonical output item ID plus normalized ingredient item-ID/count signature, with reviewed fallbacks only when those IDs are unavailable.

### 3. Secondary community cross-check

Use a second independent source for unexplained differences where practical. This is a reconciliation aid, not authority to silently overwrite client-derived structure.

## Release gate

A dataset may be marked `COMPLETE_VERIFIED` only when all of these hold:

1. every live-client recipe classified as Cooking or Alchemy is present;
2. every recipe output resolves to an item;
3. every ingredient resolves to an item;
4. every recipe has at least one non-empty variant;
5. counts are positive finite values;
6. duplicate recipe identities are resolved deterministically;
7. alternative recipe blocks remain distinct;
8. extractor-marked byproduct-only outputs are not exposed as directly craftable target recipes;
9. Cooking/Alchemy Codex reconciliation has zero unexplained canonical output/signature differences; differing Codex page IDs alone are never a missing-recipe signal;
10. every UI-visible item has an icon resolution result (local extracted icon, approved remote icon, or explicit reviewed fallback);
11. provenance records extraction/source timestamps and dataset fingerprint.

Any unexplained diff keeps the dataset in `INCOMPLETE_REVIEW`.

## Yield correctness

The game can produce variable quantities and higher-grade/random products. Do not infer guaranteed output from a community average.

For desired-output mode:
- default calculation is conservative/minimum-yield where the dataset supports it;
- expected-yield planning must be explicit;
- craft-attempt mode is exact with respect to ingredient consumption per attempt.

If the client source cannot provide a server-side yield distribution, the UI must state that limitation rather than fabricate precision.
