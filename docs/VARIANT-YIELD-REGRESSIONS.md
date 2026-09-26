# Variant yield regression matrix

Production variant-yield work is not complete until these cases pass.

| Case | Required result |
| --- | --- |
| Output target selects variant A with yield 1-4 | Minimum/maximum/expected attempt math uses A only |
| Output target selects variant B with yield 1 | Attempt math uses B only |
| Crafted intermediate has selected variant-specific yield | Recursive shortage expansion uses that variant yield |
| Attempts/servings mode | Material servings remain exact and independent of yield |
| Selected variant has unknown provenance | Conservative-yield warning is shown |
| Unselected variant has unknown provenance | It does not cause a warning for the selected verified variant |
| Production variant lacks canonical source recipe ID | Release fails |
| Source URL recipe ID differs from sourceRecipeId | Release fails |
| Two source pages map to one exact signature with different yield bounds | Release fails |
| Codex detail page has no base output | No yield is synthesized |

Source-backed acceptance pair: Codex recipe 169 and recipe 637 both produce item 9601 but represent distinct ingredient variants with different base-yield ranges. A regression fixture must preserve that distinction at planner, evidence, and release-gate layers.
