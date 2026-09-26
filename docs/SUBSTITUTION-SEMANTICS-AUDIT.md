# Substitution semantics audit

Turn90 source audit. This document records why Codex material-group membership is provenance, not by itself recipe-slot evidence.

- Current production web evidence contains 174 groups. Groups 6026 and 6027 are legitimate singletons: preserve them as provenance, never as selectable equivalence.
- BDO Codex material-group pages explicitly define member Worth as replacement value. Group 1, for example, lists iron ore / melted iron shard / iron ingot at 1 / 5 / 25 and explains that Worth can be combined to meet a recipe requirement.
- That group-level statement is **not sufficient to bind every recipe slot containing a member**. Recipe 63 requires two distinct red crystals; its long-standing recipe report explicitly says another crystal does not work in the precision slot. Group 3514 nevertheless contains those crystals together. Likewise processed-dish groups have patch-specific exceptions/ratio changes.
- The reviewed client extractor exposes exact recipe item ids/counts and repeated producing blocks, but no recipe-input material-group id. Therefore route binding cannot be inferred from the client XML alone.
- Current BDFoundry Cooking/Alchemy guides independently document raw generic categories: vegetables/fruits/grains/crop qualities, red/bird/reptile meat, flour/dough, fish/seafood, herb/mushroom quality ladders, and five interchangeable blood families. These are the initial reviewed recipe-binding families. Codex groups outside that reviewed set remain stored as provenance but unbound.
- The current guides and current Codex Worth tables disagree on some exact ratios (for example several fruit/mushroom rows). Until a current authoritative or direct in-game check resolves a disputed ratio, do not broaden automatic binding merely from membership. Production release evidence must preserve the exact Codex Worth snapshot used by the planner.
- Mixed allocation is only considered after a recipe slot has passed the reviewed binding policy. It may combine owned members until the canonical Worth target is met, and the same per-attempt composition must be repeatable for the requested batch. Explicit selection remains single-item.
- Carry/LT projection must consume the same finite inventory as the recursive planner. A later recipe slot must not reuse a high-Worth item already allocated to an earlier slot.

Reviewed references:
- https://www.blackdesertfoundry.com/cooking-guide/ — Ingredient Substitutions (updated 2026-01-30).
- https://www.blackdesertfoundry.com/alchemy-guide/ — Ingredient Substitutions (updated 2026-01-30).
- https://bdocodex.com/kr/materialgroup/1/ — current Worth semantics.
- https://bdocodex.com/kr/recipe/63/ — exact crystal recipe and route-specific substitution report.
- https://www.inven.co.kr/board/black/4123/12008 — 2023 lab patch changing selected higher-grade dish ingredient ratios to 1:3.
- iDevelopThings/bdo-data-extractor FORMATS.md @ reviewed extractor SHA — exact recipe XML contract; no material-group slot relation.
