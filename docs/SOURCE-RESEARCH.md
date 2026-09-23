# Source research and acquisition strategy

## Decision

Recipe completeness cannot depend on a hand-maintained list.

The strongest available structural source is the installed Black Desert client. The public project `iDevelopThings/bdo-data-extractor` documents per-item recipe XML extraction and emits `items.json`, `recipes.json`, and item icons. Its documented recipe output preserves cooking/alchemy type, output reference, ingredient references/counts, and alternative producing blocks.

BDO Codex KR remains a valuable independent reconciliation/enrichment source:
- Cooking catalog: https://bdocodex.com/kr/recipes/culinary/
- Alchemy catalog: https://bdocodex.com/kr/recipes/alchemy/
- detail pages expose source-local recipe page ID, Korean title, skill type/level, ingredient quantities, base-product ranges, additional/random products, substitution guidance, and links to ingredient/output item pages.

Important: BDO Codex also indexes recipes explicitly marked unavailable in game. Therefore "all Codex pages" is not the same thing as "all live recipes". Reconciliation must preserve an availability flag and treat disabled/retired pages separately instead of forcing them into the live dataset.

## Identity rules — do not key by Codex recipe page ID

Fresh cross-locale checks show that the same logical recipe can have different BDO Codex recipe-page IDs in different locale/region datasets. Therefore a Codex page ID is provenance, not canonical recipe identity.

More importantly, Codex recipe detail links expose the linked item page IDs for ingredients and outputs (for example a KR recipe page can link its base output to `/kr/item/<itemId>/`). Those item IDs are much stronger reconciliation keys than the locale-specific recipe-page ID.

Canonical/reconciliation priority:
1. client output item ID, matched to Codex linked output item ID where available;
2. client recipe type + output item ID + normalized ingredient-ID/count signature for variants, matched to Codex linked ingredient item IDs/counts;
3. independent Codex Korean output title + normalized Korean ingredient/count signature only when linked item IDs are unavailable;
4. explicit reviewed mapping for any residual ambiguity.

Never declare a recipe missing merely because a Codex locale page ID differs.

## Korean localization

The currently documented extractor CLI localization flag is not Korean-first. Structural extraction and display localization must therefore stay separate:
- client IDs/recipe graph remain canonical structural evidence;
- do not label an English extractor item name as `nameKo` in a release dataset;
- Korean display names must be enriched from a proven Korean source (BDO Codex KR or Korean client localization when independently extracted);
- reconciliation should retain both `nameKo` and `nameEn` where available.

## Completeness strategy

1. Import live client extraction.
2. Build canonical item-id / output-id recipe graph.
3. Preserve every alternative recipe block.
4. Generate normalized Korean-name/signature evidence for independent reconciliation.
5. Build/refresh a Codex manifest with source-local page id, linked output/ingredient item IDs, skill, Korean title, availability, ingredient counts, and base output range.
6. Compare primarily by canonical linked item IDs/signatures rather than Codex recipe page ID:
   - live outputs absent from Codex evidence;
   - available Codex outputs absent from client import;
   - variant/signature differences;
   - unresolved Korean ingredient names;
   - yield metadata differences.
7. Every difference must be either resolved or explicitly reviewed with a reason.
8. Only zero **unexplained** differences may promote a dataset to `COMPLETE_VERIFIED`.

## Acquisition caveat

BDO Codex category pages currently render the table shell and report "Loading data from server"; the complete row set is not present in the static category HTML. A bulk collector must identify/use the site's data/query route or another controlled enumeration path. Search-engine discovery of individual pages is useful evidence but is not a completeness proof.

Independent implementations confirm a JSON recipe transport of the form `https://bdocodex.com/query.php?a=recipes&type=product&item_id=<id>&l=<locale>`. That route is explicitly product/item scoped: it can retrieve recipes associated with one item, but its row count and ID set cannot establish the complete Cooking or Alchemy catalog. It must never be supplied to the completeness collector as catalog evidence. The complete skill-scoped transport/count remains unverified.

Once recipe detail URLs are enumerated, their linked item IDs provide a deterministic bridge back to the client graph; the remaining hard problem is exhaustive enumeration, not entity identity.

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
