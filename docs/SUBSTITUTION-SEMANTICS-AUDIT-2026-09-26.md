# KR substitution semantics audit — 2026-09-26

## Why Codex group membership is not a recipe binding

The production web collector preserves 174 current BDO Codex KR material groups. Those pages are useful membership/provenance evidence, but current route and quantity evidence shows that material-group membership cannot be promoted wholesale into recipe substitution semantics.

Current production details contain 530 catalog routes plus 20 reviewed supplemental routes. The core Cooking groups 6001..6009 touch 194 unique recipe routes. Cross-checking the current BDFoundry Cooking guide against current Codex group Worth tables shows quantity conflicts for 6001 grain, 6002 flour, 6003 dough, 6004 pepper, 6005 garlic, 6006 onion, 6007 fruit, and 6008 hot pepper. Those conflicted groups touch 179 routes. Group 6009 vegetables is the one core group whose current base/high/special values agree with the current guide (1/6/36).

Examples of conflicts:
- 6001: Codex gives wheat 1 but potato/corn and several other base grains 2; current guide treats the base grain category equally and documents 1/3/18 quality scaling.
- 6003: Codex gives wheat dough 1 and the other doughs 4; current guide gives 1 and 2.
- 6004/6005/6006/6008: Codex publishes 1/6/36; current guide publishes 1/3/18.
- 6007 fruit: Codex publishes apple 1, most other base fruits 2, high fruit 12 and special fruit 72; current guide treats base fruits equally and publishes 1/6/36.
- 5101 fish has 284 members with many different Codex Worth values, while the current guide describes fish/seafood substitution with a much simpler fresh/dried/rarity rule. It remains excluded.

The Codex recipe 112 discussion also records the site maintainer's warning that substitution data came from server-side data leaked in 2021 rather than from the game client and may have changed. This reinforces fail-closed use of Codex Worth when a current independent source disagrees.

## Reviewed vegetable route policy

Current BDFoundry recipes independently render these Codex source routes with a generic vegetable set rather than a literal exact vegetable:
112, 113, 123, 125, 127, 136, 144, 154, 159, 168, 195, 477, 478, 491, 510, 513, 570, 586, 606.

Current production details contain 29 routes that reference a member of group 6009. The 19 routes above are reviewed generic bindings. Literal or unreviewed uses stay exact. Concrete exclusions include route 210 Steamed Prawn (paprika), 354 Chicken Breast Salad (cabbage), and 360/361 Frank Sandwich (cabbage).

Binding therefore requires the exact enriched variant.sourceRecipeId plus group id, not group membership alone. Higher-Worth exact inputs remain exact unless separately reviewed.

## Mixed Worth

For reviewed vegetable routes, the current Cooking guide explicitly permits mixed rarities and gives the worked Pickled Vegetables example: one high-quality vegetable (Worth 6) plus two normal vegetables (Worth 1 each) satisfies the required Worth 8. Batch Production is configured with ingredients for one result and then repeated, so automatic mixed allocation must find one composition that is repeatable for every requested attempt; it must not assume a different composition can be selected on each automatic craft.

## Next evidence layer

Do not expand the route list by trusting Codex Worth. Add a reviewed semantics artifact that can independently bind:
- exact sourceRecipeId + groupId,
- reviewed member values when current guide evidence supersedes conflicting Codex Worth,
- source URL/date,
- an exact fingerprint asserted by promotion/release.

This is needed before restoring fruit/grain/flour/dough/seasoning/fish/alchemy group coverage.

References:
- https://www.blackdesertfoundry.com/cooking-guide/
- https://www.blackdesertfoundry.com/all-recipes/
- https://www.blackdesertfoundry.com/alchemy-guide/
- https://bdocodex.com/kr/materialgroup/6001/
- https://bdocodex.com/kr/materialgroup/6003/
- https://bdocodex.com/kr/materialgroup/6007/
- https://bdocodex.com/kr/materialgroup/6009/
- https://bdocodex.com/kr/materialgroup/5101/
- https://bdocodex.com/kr/recipe/112/


## Turn 93 freshness correction

The BDFoundry all-recipes page is useful as an independent route-rendering reference, but the page itself reports **Last Updated: 28 February 2021**. It must not be labelled a current source merely because it was fetched in 2026. The reviewed policy now fingerprints that source date explicitly.

Current cross-checks strengthen the need for fail-closed semantics outside reviewed group 6009. BDOlytics pages crawled in September 2026 still render live cooking graphs such as Pickled Vegetables with Pumpkin x8, Vinegar x4, Leavening Agent x2 and Sugar x2, while its rare-proc planner represents Pepper/Onion substitutions differently from both the current BDFoundry guide ratios and Codex Worth. That disagreement is evidence **against** globally promoting Codex Worth into recipe semantics.

For group 6009, the policy now fingerprints the exact 13-member itemId-to-Worth map from the production Codex evidence. apply-substitution-evidence must reject reviewed group 6009 when membership or Worth drifts from that reviewed map; a matching policy hash alone is not enough to bless changed source evidence.

Next source-expansion work should prefer route-level current evidence (or installed-client evidence when available) and retain the 2021 all-recipes page only as corroboration. Do not expand groups 6001..6008/5101 from Codex membership alone.
