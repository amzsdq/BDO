# Extractor output layout

Verified against pinned bdo-data-extractor commit `5bf11bd7bc60dcbb6126be34bf3d76633abdd8b2` (v0.1.9).

When the extractor is invoked with `--out <DATA_ROOT>`, that directory is the data root itself. Build artifacts such as `items.json`, `recipes.json`, and `mastery.json` are written directly below `<DATA_ROOT>`.

The icon pipeline also uses the same data root. It writes decoded shared WebP files below `<DATA_ROOT>/icons/` and writes the merged `asset_redirects.json` at `<DATA_ROOT>/asset_redirects.json`. Item entries in that redirect map use keys of the form `urn::item:<itemId>` and values such as `icons/<shared-slug>.webp`.

The planner therefore must resolve the item URN through the redirect map and copy the referenced decoded WebP into its own canonical `public/icons/<itemId>.webp` path. Do not assume the extractor itself emits one WebP per item ID.

The production bootstrap and handoff commands must preserve this root layout. A path such as `<DATA_ROOT>/data/items.json` is only correct when `<DATA_ROOT>/data` was explicitly passed as the extractor `--out` value.
