# bdo-data-extractor contract used by the planner

Checked: 2026-09-23
Upstream: `iDevelopThings/bdo-data-extractor`
Current reviewed release: `v0.1.9` (published 2026-08-15)

## Version floor

Use **v0.1.9 or newer** for a fresh client extraction. Record the exact tag/commit in dataset provenance.

Why the floor matters:

- v0.1.7 changed recipe `inputs` so repeated XML occurrences of the same ingredient are aggregated into one item entry with a real summed `count`. Older output can contain repeated/countless ingredient rows and must not be accepted as canonical planner input without migration.
- v0.1.7 also changed icon redirects to URN keys and required re-extraction.
- v0.1.8 fixed item extraction for a newer client record layout.
- v0.1.9 fixed the current expanded post-icon item property/footer layout and explicitly requires re-extraction.

The planner's structural validator intentionally rejects duplicate ingredient IDs inside one canonical recipe variant. That matches the v0.1.7+ extractor contract rather than attempting to preserve obsolete pre-v0.1.7 output.

## Acquisition invariant

The upstream GitHub releases contain source archives but no ready-made `items.json` / `recipes.json` release assets. Exhaustive production data therefore still requires running the reviewed extractor against a current installed BDO client (or obtaining an equivalently provenance-preserving fresh extraction). A GitHub source checkout alone is not recipe-completeness evidence.

The same upstream author also publishes `iDevelopThings/bdo-viewer`. Its documented setup lets a user point the viewer at an installed Black Desert client and runs the bundled extractor automatically. On Windows the extracted dataset is stored under `%LocalAppData%\\bdo-viewer\\` and includes `items.json`, `recipes.json`, and icons. This is a lower-friction acquisition path, but the planner must still record the bundled extractor version/commit and extraction timestamp before accepting the snapshot as canonical evidence.

## Import expectations

For every imported snapshot retain:

- extractor tag and commit;
- extraction timestamp;
- client/region provenance;
- `items.json` and `recipes.json` structural source identifiers;
- canonical item IDs and item weights;
- every Cooking/Alchemy recipe block and alternative variant;
- icon provenance/redirect mapping needed to resolve item images.

Korean names and yield ranges remain independent enrichment/reconciliation concerns; do not infer Korean localization or probabilistic yield from the extractor structural graph when it does not provide them.
