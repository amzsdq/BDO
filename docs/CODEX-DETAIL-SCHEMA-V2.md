# Codex recipe-detail artifact v2

The detail collector consumes only recipe IDs from a `complete=true` Cooking/Alchemy catalog artifact. Its output must contain exactly the same `(skill, recipeId)` set.

Each recipe record preserves: canonical recipe ID, skill, Korean title, skill-level text when present, exact ingredient item IDs/counts, base output item IDs with min/max quantity, random output item IDs with min/max quantity, canonical source URL, and an explicit base-output status.

`baseOutputStatus` is `single`, `none`, or `multiple`. Only `single` may expose compatibility fields `outputItemId` and `yield`. `none` and `multiple` must not infer an output from the title or random outputs.

Ingredient quantities must be positive exact values. Output quantities may be positive ranges. Duplicate item anchors caused by Codex icon/name links are collapsed by one logical item row, not by global item ID, so distinct rows are not silently lost.

The parser is scoped to the recipe `.card.item_info`. Recipe ID, Korean title, and skill are read from that card; whole-page text is not authoritative because navigation contains both Cooking and Alchemy labels.

Collection uses bounded concurrency, deterministic final sorting, and bounded retry only for transient HTTP failures. A final artifact is `complete=true` only after exact catalog coverage succeeds. Random-only pages remain present as evidence but cannot establish base yield.
