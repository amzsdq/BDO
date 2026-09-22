# Source research and acquisition strategy

## Decision

Recipe completeness cannot depend on a hand-maintained list.

The strongest available structural source is the installed Black Desert client. The public project `iDevelopThings/bdo-data-extractor` documents per-item recipe XML extraction and emits `items.json`, `recipes.json`, and item icons. Its documented recipe output preserves cooking/alchemy type, output reference, ingredient references/counts, and alternative producing blocks.

BDO Codex KR remains a valuable independent reconciliation/enrichment source:
- Cooking catalog: https://bdocodex.com/kr/recipes/culinary/
- Alchemy catalog: https://bdocodex.com/kr/recipes/alchemy/
- detail pages expose recipe ID, Korean title, skill type/level, ingredient quantities, base-product ranges, and additional/random products.

Important: BDO Codex also indexes recipes explicitly marked unavailable in game. Therefore "all Codex pages" is not the same thing as "all live recipes". Reconciliation must preserve an availability flag and treat disabled/retired pages separately instead of forcing them into the live dataset.

## Completeness strategy

1. Import live client extraction.
2. Build canonical item-id / output-id recipe graph.
3. Preserve every alternative recipe block.
4. Generate normalized Korean-name signatures for independent reconciliation.
5. Build/refresh a Codex manifest with recipe page id, skill, title, availability, ingredient names/counts, and base output range.
6. Compare:
   - live output titles absent from Codex;
   - available Codex titles absent from client import;
   - variant/signature differences;
   - unresolved ingredient names;
   - yield metadata differences.
7. Every difference must be either resolved or explicitly reviewed with a reason.
8. Only zero **unexplained** differences may promote a dataset to `COMPLETE_VERIFIED`.

## Licensing / provenance

Do not copy third-party extractor source into this repository merely for convenience. Treat extractor output as an external source artifact and record tool version/commit plus extraction timestamp. Item/game assets remain Pearl Abyss content; the app should store provenance and avoid implying ownership.

## Yield model

Client recipe XML is useful for ingredient consumption, but variable server-side output distribution is not fully represented by the structural extraction. BDO Codex detail pages expose base-product ranges for many recipes.

Therefore:
- craft-attempt mode is the strongest deterministic calculation;
- desired-output mode must disclose its yield policy;
- minimum/base range enrichment is source-attributed;
- expected-yield values require a separate proven source or user choice;
- random higher-grade products are informational unless a valid expected-rate model is available.

## Ingredient substitution

Black Desert recipes can permit practical substitution families/grades. A single displayed Codex ingredient example must not be interpreted as the only legal in-game ingredient if the client/source data exposes alternative recipe blocks or reviewed substitution equivalence.

The planner data model must keep alternatives rather than collapsing them into one arbitrary ingredient list.
