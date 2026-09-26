# Substitution semantics audit

Turn89 findings to preserve before production client extraction.

- Material-group Worth is real source evidence, and mixed rarity is a real recipe behavior. The concrete Pickled Vegetables example is vegetables x8 = High-Quality Paprika x1 (worth 6) + Paprika x2.
- Current production web evidence contains 174 groups and 844 member rows. All Worth values fit one decimal place. Groups 6026 and 6027 are legitimate singletons: preserve them as provenance, never as selectable equivalence.
- Heterogeneous-Worth groups touch 435 current recipes through a minimum-Worth canonical ingredient; 357 have canonical count >1. This is the bounded source-supported set for mixed allocation.
- Do not globally bind every recipe input merely because its exact item is a member of a material group. Special Honey Jar recipe 228 requires Top-quality Cooking Honey x2; independent game reporting explicitly says lower-quality Cooking Honey cannot replace it even though all are in group 6014.
- The reviewed client extractor exposes exact recipe item ids/counts and alternative producing blocks, but no recipe-input material-group id.

Safe implementation rule: mixed auto-allocation is enabled only when the recipe's canonical member is at the group's minimum Worth. It may combine owned members until per-attempt sum(count * Worth) reaches the canonical target, and the same composition must be repeatable for every requested attempt. Explicit selection remains single-item. Higher-Worth exact recipe slots remain unbound unless stronger route-specific evidence exists.

Sources reviewed: Black Desert Foundry Cooking Guide (Ingredient Substitutions), BDO Codex material groups 6004/6014, Inven Global Fairy/Special Honey Jar guide, and iDevelopThings/bdo-data-extractor FORMATS.md.
