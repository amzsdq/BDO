# Mastery data policy

Status: release-blocking policy for issue #5.

## Authoritative source

Cooking and Alchemy mastery effects must be sourced from Pearl Abyss' Korean Black Desert patch/guide material, not community calculators.

Current verified source snapshot:
- Publisher: Pearl Abyss / 검은사막 한국
- Page: `[업데이트] 1월 8일(수) 업데이트 안내`
- URL: https://www.kr.playblackdesert.com/ko-kr/News/Detail?countryType=ko-kr&groupContentNo=13398
- Page last-modified marker observed by source review: 2025-02-12 11:56
- Verified by project: 2026-09-23 KST

The source explicitly publishes separate Cooking and Alchemy mastery tables. Cooking includes `요리 시 대량 요리 발동 확률`; Alchemy instead publishes maximum/additional result probabilities. Therefore the two skills MUST NOT share a generic mastery formula.

The current Pearl Abyss KR Cooking Adventurer Guide is also first-party semantic evidence for Mass Cooking itself:
- Page: `[모험가 가이드] 요리`
- URL: https://www.kr.playblackdesert.com/ko-KR/Wiki?wikiNo=102
- Section: `4. 대량 요리와 부산물(마녀의 별미)`
- Verified by project: 2026-09-23 KST
- It states that Mass Cooking can activate during a continuous run of at least 10 crafts, consumes 10 crafts' worth of ingredients at once, produces 10 crafts' worth of results, and decreases Cooking Utensil durability by 1.

This first-party guide removes the previous uncertainty around the 10-serving Mass Cooking consumption multiplier. The probability still comes from the source-verified mastery breakpoint table; the multiplier/durability semantics come from the Cooking guide.

## Runtime data contract

A mastery table committed for runtime use must carry:

```ts
interface MasterySourceMeta {
  provider: 'Pearl Abyss';
  region: 'KR';
  sourceUrl: string;
  sourceTitle: string;
  sourceLastModified?: string;
  verifiedAt: string;
}

interface CookingMasteryRow {
  mastery: number;
  massCookingProbability: number; // 0..1
}
```

The checked-in table must be an exact transcription of the publisher table and covered by boundary tests. Do not interpolate between published mastery rows unless the game itself documents interpolation semantics.

## Client-derived cross-check

The reviewed `iDevelopThings/bdo-data-extractor` contract emits `data/mastery.json` from current installed-client mastery tables. Treat this as an independent structural cross-check, not as a replacement for the publisher-facing semantic source above.

For every production client snapshot used for release:

- retain `mastery.json` with the extractor tag/commit, game/client fingerprint, region and extraction timestamp;
- compare the planner's Cooking mastery breakpoints/rates against the extracted Cooking curve deterministically;
- compare Alchemy rates separately against the extracted Alchemy curve;
- fail release review on an unexplained mismatch instead of silently overwriting, interpolating, or merging the two skill models;
- keep the Pearl Abyss KR source metadata in the runtime diagnostics/about-data surface so a user can audit what each probability means.

This makes stale checked-in mastery data detectable while preserving the distinction between client-derived numeric evidence and the product's human-readable semantic provenance.

## Durability/material semantics

`utensil durability uses` and `recipe material servings` are distinct quantities.

For Cooking, one normal craft consumes one serving and one durability use. A Mass Cooking activation consumes 10 servings while still decreasing utensil durability by 1, per the first-party Cooking guide above. Therefore, for `n` durability uses and `M` Mass Cooking activations, material servings are exactly `n + 9M`. Since `M` is probabilistic below 100% Mass Cooking chance, minimum/expected/safe/maximum material-serving forecasts must remain explicitly probabilistic except at deterministic breakpoints.

The deterministic weight planner remains exact input-load math for whichever explicit material-serving preparation target the user selected. It must not silently absorb an expected/probabilistic output estimate or equate durability uses with material servings.

Alchemy mastery remains separate; do not apply Cooking Mass Cooking behavior to Alchemy.

## Release checks

- source metadata present and visible to diagnostics/about-data UI;
- all runtime rows match the recorded source snapshot;
- production snapshots include a deterministic `mastery.json` cross-check when the reviewed extractor emits it;
- unexplained publisher-vs-client mastery mismatches block release review;
- tests cover exact published mastery breakpoints and out-of-range handling;
- unknown/unverified mastery data disables probabilistic forecasts rather than guessing;
- updating the source table requires updating `verifiedAt` and rerunning tests;
- Mass Cooking multiplier/durability semantics remain tied to the recorded first-party Cooking guide evidence;
- the UI distinguishes exact LT/carry quantities from expected/probabilistic forecasts.
