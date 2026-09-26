# Substitution semantics audit

Turn89 findings used by the substitution-correctness candidate.

- BDO Codex material groups expose per-member Worth. Black Desert Foundry gives the concrete Pickled Vegetables rule: Vegetables x8 can be High-Quality Paprika x1 (worth 6) + Paprika x2. Mixed rarity is therefore a real planner requirement.
- Current production web evidence has 174 groups / 844 member rows; all Worth values fit one decimal place. Groups 6026 and 6027 are legitimate singletons and must remain provenance only.
- The safe direction is canonical Worth or higher. Higher-quality members replace lower-quality requirements; lower-Worth members must not satisfy a higher-Worth exact requirement.
- Special Honey Jar is the critical regression: recipe 228 requires Top-quality Cooking Honey x2. Independent game reporting explicitly says High-Quality/Cooking Honey cannot replace it, although all are in Codex group 6014.
- The reviewed client extractor exposes exact recipe item ids/counts and alternative producing blocks, but no material-group id on recipe inputs.

Implementation consequence: auto/explicit substitution candidates are filtered to members with Worth >= the canonical member Worth. Mixed auto allocation may combine eligible owned members until per-attempt sum(count * Worth) reaches canonical count * canonical Worth, and the same composition must be repeatable for every requested attempt. Explicit selection remains a single item. Unsupported Worth precision fails closed to the existing single-item path.

Sources reviewed: Black Desert Foundry Cooking Guide, BDO Codex material groups 6004/6014, Inven Global Special Honey Jar/Fairy guide, KR Black Desert community Q&A on higher/lower ingredient substitution, and iDevelopThings/bdo-data-extractor FORMATS.md.
