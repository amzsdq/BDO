# bdo-data-extractor contract used by the planner

Checked: 2026-09-24
Upstream: `iDevelopThings/bdo-data-extractor`
Current reviewed release: `v0.1.9` (published 2026-08-15)

## Version floor

Production extraction is pinned to the exact reviewed commit `5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2` (upstream v0.1.9 at review time). Do not silently accept a newer tag/commit: review it first, update `production-source-contract.mjs`, and record the exact commit in dataset provenance.

Why the floor matters:

- v0.1.7 changed recipe `inputs` so repeated XML occurrences of the same ingredient are aggregated into one item entry with a real summed `count`. Older output can contain repeated/countless ingredient rows and must not be accepted as canonical planner input without migration.
- v0.1.7 also changed icon redirects to URN keys and required re-extraction. The reviewed icon output includes `asset_redirects.json`; `urn::item:<itemId>` entries resolve decoded WebP assets, and redirect paths may use platform-native separators.
- v0.1.8 fixed item extraction for a newer client record layout.
- v0.1.9 fixed the current expanded post-icon item property/footer layout and explicitly requires re-extraction.

The planner's structural validator intentionally rejects duplicate ingredient IDs inside one canonical recipe variant. That matches the v0.1.7+ extractor contract rather than attempting to preserve obsolete pre-v0.1.7 output.

## Recipe identity invariant

Current upstream `recipes.json` exports recipe records as `{output,type,station,inputs,byproductOf?}`. The reviewed public JSON contract does **not** expose a separate source recipe id. Upstream `FORMATS.md` explicitly states that repeated producing blocks are alternative recipes.

Therefore the planner must not fabricate a source recipe identity. For Cooking/Alchemy:

- planner recipe identity is `(skill, outputItemId)`;
- every distinct direct ingredient signature for that identity is preserved as an alternative variant;
- direct and byproduct rows remain distinct even when their ingredients are identical;
- internal variant ids are deterministic functions of canonical variant content and must not depend on extractor row order;
- if a future extractor release exposes a real stable recipe/block identity, review and version this contract before adopting it.

This preserves source-backed alternatives without pretending the current extractor supplies identity that it does not.

## Acquisition invariant

The upstream GitHub releases contain source archives but no ready-made `items.json` / `recipes.json` release assets. Exhaustive production data therefore still requires running the reviewed extractor against a current installed BDO client (or obtaining an equivalently provenance-preserving fresh extraction). A GitHub source checkout alone is not recipe-completeness evidence.

The same upstream author also publishes `iDevelopThings/bdo-viewer`. Its documented setup lets a user point the viewer at an installed Black Desert client and runs the bundled extractor automatically. On Windows the extracted dataset is stored under `%LocalAppData%\\bdo-viewer\\` and includes `items.json`, `recipes.json`, and icons. This is a lower-friction acquisition path, but the planner must still record the bundled extractor version/commit and extraction timestamp before accepting the snapshot as canonical evidence.

## Client mastery cross-check

The reviewed upstream contract also emits `data/mastery.json`. It contains client-side life-skill mastery proc/yield curves keyed by mastery value, including separate `cooking` and `alchemy` rate columns.

For planner correctness this is **independent client-derived evidence**, not permission to collapse Cooking and Alchemy into one model:

- retain the existing Pearl Abyss KR source/version metadata as the human-auditable product source;
- when a production client snapshot is imported, preserve the matching `mastery.json` and extractor provenance alongside `items.json` / `recipes.json`;
- deterministically compare mastery thresholds and only those client rate columns whose semantics have been independently mapped to the corresponding Pearl Abyss field;
- do **not** assume a `rates[]` index is Mass Cooking or another named effect merely because the numeric curve looks similar; the reviewed extractor intentionally preserves some columns whose exact roles are not fully confirmed;
- compare Cooking and Alchemy separately and never reinterpret an Alchemy rate as Cooking Mass Cooking;
- any unexplained disagreement between the source-versioned product table and the current client extraction is a release-review item, not something to silently interpolate or overwrite.

This cross-check reduces stale mastery-table risk without making the extractor the sole semantic authority for probabilistic UX labels.

## Import expectations

For every imported snapshot retain:

- extractor tag and commit;
- extraction timestamp;
- client/region provenance;
- `items.json` and `recipes.json` structural source identifiers;
- `mastery.json` when emitted by the reviewed extractor, for deterministic mastery cross-checks;
- canonical item IDs and item weights;
- every Cooking/Alchemy recipe block and alternative variant;
- icon provenance/redirect mapping needed to resolve item images.

Korean names and yield ranges remain independent enrichment/reconciliation concerns; do not infer Korean localization or probabilistic yield from the extractor structural graph when it does not provide them.
