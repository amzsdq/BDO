# Substitution and variant-yield ambiguity

A substitution choice must not silently retain a yield that belongs to a different source-backed ingredient signature.

Live acceptance case: source recipes 169 and 637 both produce item 9601. Their first ingredients are members of material group 6503 (Worth 1 and 6), while the pages expose different base-yield ranges. Therefore a user can potentially transform one explicit variant's ingredient slot into the other variant's signature through substitution.

Before production release, the planner must resolve this ambiguity explicitly. Preferred rule: after applying source-backed substitutions, canonicalize the resulting ingredient signature to an exact source-backed explicit variant when one exists, and use that variant's yield/source identity. If the transformed signature maps to multiple variants with conflicting yield evidence, planning must fail closed. If no exact source-backed signature exists, output-target planning must not claim a verified variant yield for the transformed route.

Regression coverage must include both directions of material group 6503 and verify that substitution cannot preserve a stale yield from the pre-substitution variant.
