# Codex item evidence live regressions

Verified against BDO Codex KR live item pages on 2026-09-26 KST.

The unified item-evidence collector must preserve these row-level facts:
- item 6214: 늑대 피, 0.10 LT, material group 805.
- item 9203: 치즈 그라탱, 0.10 LT, material group 6503.
- item 9282: 쫀득한 치즈 그라탱, 0.10 LT, material group 6503.
- item 9601: 발레노스 정식, 0.10 LT, material group 6523.
- item 45334: 예리한 파괴의 정령석, 0.05 LT, Alchemy mastery minimum 500.
- item 45341: 예리한 수호의 정령석, 0.05 LT, Alchemy mastery minimum 500.

Parser invariants:
- scope extraction to the balanced `div.card.item_info`; nested divs must not truncate the card.
- bind identity to the card-header `ID:` value, not arbitrary item links inside the card.
- Korean weight labels may render as `무 게`; normalize whitespace.
- use the Korean `.item_title#item_name`, not the duplicate English `#item_name`.
- material-group discovery must not include links outside the item card.
- missing/unterminated cards and card-ID mismatches fail closed.
