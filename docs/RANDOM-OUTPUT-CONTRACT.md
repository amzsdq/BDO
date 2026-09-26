# Random and higher-grade output contract

Codex recipe detail evidence contains variant-specific random outputs in addition to the base output. These must not be flattened into the base yield or presented as guaranteed production.

Live acceptance pair: recipe 169 reports base item 9601 at 1-4 and random item 9602 at 1-2, while recipe 637 reports base item 9601 at 1 and random item 9602 at 1. The evidence therefore belongs to the exact ingredient variant/source recipe.

The production model should preserve random output item ID and bounded per-proc quantity on the variant. Without a verified proc probability, the planner may show that the random output is possible and its per-proc quantity range, but must not add it to guaranteed target output, deterministic inventory totals, or an exact peak/output-weight estimate.

If probability evidence is later added, expected-value UI must remain explicitly probabilistic and separate from guaranteed minimum/maximum base-output math.

## Client alias normalization

The reviewed client extractor records producing recipes for output items but does not carry a role marker that distinguishes a deterministic base output from a parallel random/higher-grade output. A random output can therefore arrive as a direct pseudo-recipe in the broad client graph.

Before Codex detail binding, `normalize-codex-random-output-aliases.mjs` may remove such a pseudo-recipe only when a schema-v2 Codex `single-base` route provides an exact match on life skill, the full pre-substitution ingredient signature, and the random output item ID. The removed output is recorded as a byproduct of the exact base output instead. Distinct direct signatures remain direct recipes, ambiguous matches fail closed, and `random-only` routes are never normalized away as aliases.

This normalization requires completed bounded supplemental discovery. Catalog-only detail evidence is insufficient because a catalog-hidden random-only route could otherwise be mistaken for a pseudo-recipe.

## Output classifications

`single-base` has exactly one deterministic base output and may also carry random outputs. `random-only` has no deterministic base output; attempts mode may calculate required inputs, but output quantity is not guaranteed. `no-output` records a source recipe whose published page has no output evidence and must not synthesize yield. `unavailable` is accounted evidence for a disabled route and is excluded from live reconciliation math.

All source binding is performed against pre-substitution ingredient identity. Substitution expansion must not be used to rebind a source recipe or transfer yield evidence between routes.

