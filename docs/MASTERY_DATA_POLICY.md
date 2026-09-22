# Mastery data policy

Status: release-blocking policy for issue #5.

## Authoritative source

Cooking and Alchemy mastery effects must be sourced from Pearl Abyss' Korean Black Desert patch/guide material, not community calculators.

Current verified source snapshot:
- Publisher: Pearl Abyss / 검은사막 한국
- Page: `[업데이트] 1월 8일(수) 업데이트 안내`
- URL: https://www.kr.playblackdesert.com/ko-kr/News/Detail?countryType=ko-kr&groupContentNo=13398
- Page last-modified marker observed by source review: 2025-02-12 11:56
- Verified by project: 2026-09-22 KST

The source explicitly publishes separate Cooking and Alchemy mastery tables. Cooking includes `요리 시 대량 요리 발동 확률`; Alchemy instead publishes maximum/additional result probabilities. Therefore the two skills MUST NOT share a generic mastery formula.

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

## Durability/material semantics

`utensil durability uses` and `recipe material servings` are distinct quantities.

For Cooking, one durability use can consume more than one material serving when Mass Cooking triggers. Any material forecast derived from mastery probability is probabilistic and must be labelled as such. The deterministic weight planner remains exact input-load math and must not silently absorb probabilistic mastery assumptions.

Before exposing expected/safe/max material forecasts in production, verify the current game's Mass Cooking consumption multiplier from first-party evidence (or client data if the multiplier is encoded there). Do not promote a community-only multiplier into canonical runtime data.

Alchemy mastery must remain separate; do not apply Cooking Mass Cooking behavior to Alchemy.

## Release checks

- source metadata present and visible to diagnostics/about-data UI;
- all runtime rows match the recorded source snapshot;
- tests cover exact published mastery breakpoints and out-of-range handling;
- unknown/unverified mastery data disables probabilistic forecasts rather than guessing;
- updating the source table requires updating `verifiedAt` and rerunning tests;
- the UI distinguishes exact LT/carry quantities from expected/probabilistic forecasts.
