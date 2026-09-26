# Codex recipe-detail artifact v2

The collector starts from an independently `complete=true` KR Cooking/Alchemy catalog and preserves that exact catalog-listed `(skill, recipeId)` set. With `--probe-gaps true`, it also probes numeric gaps from recipe ID 1 through the catalog high-water mark. Supplemental rows carry `catalogListed=false` and `discovery="catalog-gap-probe"`; they never alter the independent catalog equality gate.

`supplementalDiscovery.complete=true` means every gap inside the recorded bounded range was accounted for. The artifact records `probedMinRecipeId`, `probedMaxRecipeId`, and `boundedByCatalogHighWater=true`. It is not evidence that recipe IDs above that high-water mark do not exist.

Each recipe record preserves canonical recipe ID, skill, Korean title and skill text when present, exact ingredient item IDs/counts, base/random output item IDs with min/max quantity, canonical source URL, discovery provenance, and one explicit status:

- `single-base`: exactly one published deterministic base output; only this status may expose `outputItemId` and deterministic `yield`.
- `random-only`: no base output and one or more published random outputs. Never synthesize deterministic yield.
- `multiple-base`: more than one base output; fail closed for deterministic yield binding.
- `no-output`: exact ingredients are published but no output is published. Binding requires globally unique skill + full pre-substitution ingredient identity.
- `unavailable`: the identified Codex card explicitly says the recipe cannot be used in game, or an actual missing page is returned. Stale output rows on a disabled card are ignored.
- `unresolved`: acquisition or parsing could not prove one of the above states. Any unresolved route makes the artifact incomplete.

Ingredient quantities must be positive exact values. Output quantities may be positive ranges. A quantified ingredient row without exact item identity is rejected. For `no-output` pages, the skill-calculator quantity rows are also cross-checked against parsed exact ingredient identities; extra quantified calculator rows indicate a partial Codex page and fail closed rather than creating an incomplete signature.

Recipe identity and skill are scoped to the recipe `.card.item_info`. Generic page prose such as `not found` cannot override a valid identified card. The explicit Codex disabled marker is evaluated only after card identity and skill are established.

Collection uses bounded concurrency, deterministic sorting, and bounded retry only for transient failures. Catalog-listed terminal failures remain unresolved; expected 404s from supplemental gap probes are treated as absent IDs. A schema-v2 artifact is `complete=true` only when catalog equality holds and every discovered/present route has zero unresolved status.

Random-output alias normalization additionally requires the explicit bounded supplemental-discovery provenance above. It must use full pre-substitution ingredient signatures and must not treat catalog-only evidence as sufficient.

## Reviewed retired-route state

Codex can retain historical recipe/item pages after the KR live service removes the corresponding crafting route. For catalog-gap routes, an official KR PC update may therefore override the stale page's apparent output state only through reviewed route-state evidence. The evidence must use the reviewed schema/scope, cite an official `https://www.kr.playblackdesert.com/` source, record effective/review dates, and identify exact recipe IDs and skill. A reviewed route must remain absent from the current independent catalog; a catalog conflict fails closed.

An observed reviewed route is represented as `status="unavailable"` plus `liveState="retired-reviewed"`. The detail artifact embeds the exact reviewed evidence and its deterministic `retiredCraftingOutputItemIds`. The reviewed evidence also records `retiredCraftingIngredientItemIds` for ingredients that the same official update explicitly deleted. Applying the review may resolve a historical partial page and recompute bounded `supplementalDiscovery.complete`, but it may not hide any unrelated unresolved route. The broad client graph must prune those retired crafting outputs and any recipe variant that consumes a reviewed deleted crafting ingredient before random-alias normalization/binding. Unrelated variants for the same output are preserved. Promotion and the final release gate reject any surviving recipe whose output intersects the retired-output set or whose inputs consume a reviewed deleted ingredient. Because the entire detail artifact is SHA-256 bound through reconciliation/promotion, this reviewed state participates in the existing provenance chain.
