# Random and higher-grade output contract

Codex recipe detail evidence contains variant-specific random outputs in addition to the base output. These must not be flattened into the base yield or presented as guaranteed production.

Live acceptance pair: recipe 169 reports base item 9601 at 1-4 and random item 9602 at 1-2, while recipe 637 reports base item 9601 at 1 and random item 9602 at 1. The evidence therefore belongs to the exact ingredient variant/source recipe.

The production model should preserve random output item ID and bounded per-proc quantity on the variant. Without a verified proc probability, the planner may show that the random output is possible and its per-proc quantity range, but must not add it to guaranteed target output, deterministic inventory totals, or an exact peak/output-weight estimate.

If probability evidence is later added, expected-value UI must remain explicitly probabilistic and separate from guaranteed minimum/maximum base-output math.
