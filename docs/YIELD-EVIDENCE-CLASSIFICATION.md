# Production yield evidence classification

Recipe-detail reconciliation must classify each source-backed variant before applying yield evidence.

1. **Single base output**: exactly one base output item with positive min/max bounds. This can drive minimum/maximum output-target planning. Expected planning uses a verified expected value only when independently available; otherwise it falls back to the minimum and remains labeled accordingly.
2. **Random-only output**: no base output and one or more random outputs. Preserve the route and random-output evidence, but do not derive a guaranteed output-target attempt count without probability evidence.
3. **Multiple base outputs**: preserve all evidence and fail closed for deterministic output-target binding until the product model explicitly supports the semantics.
4. **Malformed/unknown**: missing ingredients, unparseable quantities, skill/ID mismatch, or unsupported page structure blocks evidence promotion.

Release coverage must count all catalog/client variants by one of these explicit states. It must not achieve 100% coverage by forcing random-only or ambiguous routes into a positive recipe-level yield.
