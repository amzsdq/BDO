# Variant-specific yield contract

Production yield evidence is variant-scoped, not recipe-scoped.

A selectable recipe variant may override the legacy recipe-level yield. Planning must use the selected variant's yield for desired-output attempts and for recursively crafted intermediates. Recipe-level yield remains only as a backward-compatible fallback for development fixtures until production evidence is complete.

Canonical evidence must bind an exact client variant ingredient signature to a canonical BDO Codex KR recipe ID. Accepted reconciliation diffs, title-only matches, or substitution-equivalent signatures are not sufficient yield evidence.

If multiple Codex source recipes match the same exact client variant signature, their base-yield ranges must agree. Conflicting ranges are a release blocker. Production release coverage is measured over selectable variants, not only recipe objects.

Source-backed regression case: Codex recipes 169 and 637 both produce item 9601 but use different ingredient variants and expose different base yields. They must never be flattened into one shared recipe-level yield.
