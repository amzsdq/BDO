# Random-only recipe planning semantics

A live Codex page can have ingredients and a random output while its base-output section is empty. Recipe 346 is a current example: the page lists ingredients, an empty base-product section, and item 45340 only under random output.

Such a page must remain in completeness evidence, but it cannot be represented as a guaranteed positive base yield. In particular, the importer placeholder `min=1,max=1` must never become release evidence for this route.

Until a source-backed proc probability is available, attempts/servings planning may preserve the recipe as a probabilistic route with an explicit warning, but desired-output planning must not convert an exact requested output quantity into a guaranteed attempt count. Random output must not enter deterministic inventory totals or exact output-weight math.

Reconciliation should classify random-only detail separately from a missing page or a normal base-output mismatch. It should compare source identity/ingredients against the appropriate client route without using title-only fallback to manufacture a base output.
