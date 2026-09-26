# Recipe data completeness policy

Missing Cooking or Alchemy recipes are a release blocker.

## Source hierarchy

### 1. Live BDO client extraction — canonical structural source

The strongest known completeness path is the installed game client's own recipe data. The open-source `iDevelopThings/bdo-data-extractor` project documents and extracts per-item recipe XMLs into `recipes.json`, with item localization and icons into `items.json`.

BDO does not vendor that project's implementation or game assets by default. Instead, BDO will provide an importer for its documented JSON output and record the extractor/version/source timestamp in provenance metadata.

This path exists because a manually maintained community list can be stale or incomplete.

### 2. BDO Codex KR — reconciliation/enrichment source

Reconcile the imported Cooking and Alchemy sets against:
- https://bdocodex.com/kr/recipes/culinary/
- https://bdocodex.com/kr/recipes/alchemy/

BDO Codex also provides recipe detail pages and item imagery useful for human verification/enrichment.

Codex recipe-page IDs are provenance identifiers, not canonical recipe identity: locale/region pages can assign different page IDs to the same logical recipe. Reconciliation therefore keys primarily by linked canonical output item ID plus normalized ingredient item-ID/count signature, with reviewed fallbacks only when those IDs are unavailable.

Catalog acquisition itself is fail-closed. A generic JSON `id` field is not accepted as recipe identity because the same payload may contain item, category, row, or other identifiers. Automated catalog evidence must expose a recipe-specific id field or canonical `/kr/recipe/<id>/` URL, and a non-empty list alone never proves pagination completeness.

For automated JSON collection, a candidate URL must remain on HTTPS BDO Codex after redirects, use the known `query.php?a=recipes` recipe transport, bind the requested Cooking/Alchemy scope explicitly, and must not be an item/product-scoped transport (`item_id` or `type=product`). Merely being hosted by BDO Codex or returning recipe-shaped rows is not completeness evidence. The exact complete-catalog transport still requires independent verification before production use.

The release pipeline requires an independently complete catalog artifact for both Cooking and Alchemy. Each skill entry must record the endpoint/evidence used, a positive independently supported recipe count, and the exact unique recipe-page ID set. The reconciliation report must cover the same total page count and the same recipe-page ID set. A partial manifest that agrees with itself is not completeness proof.

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
9. independently complete Cooking and Alchemy Codex catalogs exist, with exact positive counts and recipe-page ID sets;
10. Codex reconciliation covers exactly that complete catalog count and recipe-page ID set and has zero unexplained canonical output/signature differences; differing Codex page IDs alone are never a missing-recipe signal;
11. every UI-visible item has its canonical local `icons/<itemId>.webp` asset installed and verified by the release icon manifest; remote/fallback icons are resilience only and do not satisfy production release;
12. provenance records extraction/source timestamps, the exact reviewed extractor revision, a valid `sha256:<64hex>` client fingerprint, and dataset fingerprint.

Any unexplained diff, incomplete catalog evidence, catalog/reconciliation count mismatch, or recipe-ID-set mismatch keeps the dataset unreleasable.

## Yield correctness

The game can produce variable quantities and higher-grade/random products. Do not infer guaranteed output from a community average.

For desired-output mode:
- default calculation is conservative/minimum-yield where the dataset supports it;
- expected-yield planning must be explicit;
- craft-attempt mode is exact with respect to ingredient consumption per attempt.

If the client source cannot provide a server-side yield distribution, the UI must state that limitation rather than fabricate precision.
