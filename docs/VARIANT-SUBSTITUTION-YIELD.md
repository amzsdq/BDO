# Substitution and variant-yield identity

Substitution and source-recipe identity are related but must not be conflated.

Live evidence: Codex recipes 169 and 637 both produce item 9601, but they are distinct source recipes with different skill requirements, ingredient signatures, base yields, and random-output ranges. Recipe 169 uses item 9203 and reports base yield 1~4 at Cooking Skilled 6; recipe 637 uses item 9282 and reports base yield 1 at Beginner 1. Items 9203 and 9282 are members of material group 6503 (Worth 1 and 6), and Codex documents general substitution behavior separately from the source recipe records.

## Required model

A selected planner variant represents a **source recipe identity**, not merely an ingredient signature. It therefore carries its own sourceRecipeId, skill requirement, base-output classification/yield, and random-output evidence.

Applying a source-backed ingredient substitution does not by itself rewrite that selected sourceRecipeId or borrow another source recipe's yield. The selected source variant remains the provenance for output semantics while substitution evidence controls the material slot/count.

This matters because substituting item 9282 into the recipe-169 material slot can produce the same material signature shown on recipe 637, while the two source pages still publish different skill/yield semantics. Signature equality after substitution is not sufficient evidence to switch source identity.

## Fail-closed ambiguity rule

If production evidence cannot establish that the selected source recipe permits the requested substitution, or if a transformed route creates conflicting source semantics that cannot be disambiguated, desired-output planning must fail closed rather than silently rebinding yield. Attempts/servings material planning may continue when the substitution itself is source-backed because it does not require a deterministic output-yield claim.

Regression coverage must preserve recipe 169 and 637 as distinct source variants, verify their different output-target math, and verify that substitution never silently changes or borrows sourceRecipeId/yield solely because the transformed ingredient signature matches another variant.
