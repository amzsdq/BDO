# Random-only recipe planning semantics

A Codex detail page can have ingredients and a random output while its base-output section is empty. This DOM shape is `random-only`; it is not, by itself, evidence that the route is currently live. Historical recipe 346 still exhibits this shape (ingredients, empty base-product section, item 45340 under random output) even though reviewed KR route-state evidence retires recipes 342-346.

Such a page must remain in completeness evidence, but it cannot be represented as a guaranteed positive base yield. In particular, the importer placeholder `min=1,max=1` must never become release evidence for this route.

Until a source-backed proc probability is available, attempts/servings planning may preserve the recipe as a probabilistic route with an explicit warning, but desired-output planning must not convert an exact requested output quantity into a guaranteed attempt count. Random output must not enter deterministic inventory totals or exact output-weight math.

Reconciliation should classify random-only detail separately from a missing page or a normal base-output mismatch. It should compare source identity/ingredients against the appropriate client route without using title-only fallback to manufacture a base output.
