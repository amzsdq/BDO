# Codex guardian-stone identity audit — 2026-09-26

Do not bind BDO Codex outputs by Korean display name.

The historical KR recipe 346 page still renders `예리한 수호의 정령석` under `추가 (무작위) 제품` and its output anchor resolves to `/kr/item/45340/`. Separately, the current KR item page `/kr/item/45341/` has the same Korean display name, 0.05 LT, and an Alchemy Mastery 500+ acquisition statement. Other locale indexes expose both 45340 and 45341 as distinct same-name item IDs. Therefore 45341 must not replace 45340 merely because its item page is fresher or easier to resolve.

Production binding rule: preserve the exact item ID from the recipe output anchor. Item-page evidence (name, weight, mastery) must be joined by exact item ID, never by title. If a recipe-linked item page is unavailable or locale evidence conflicts, retain the recipe output identity and fail closed on enrichment rather than rebinding to a same-name item.

Parser audit also found that recipe-detail regression fixtures use `랜덤 제품`, while the retained historical KR recipe 346 page uses `추가 (무작위) 제품`. The collector must recognize the live heading before production-scale detail acquisition; otherwise a real random-output section can be misclassified as no-output.

The official KR PC 2026-09-02 update retired the associated spirit-stone crafting routes. Recipe 346 is therefore a parser/identity regression anchor, not evidence that the route is currently craftable.
