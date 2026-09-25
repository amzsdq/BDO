# Codex recipe-detail live regression anchors

Validated against current BDO Codex KR pages on 2026-09-26. These anchors are for the schema-v2 detail collector; the collector must still parse the live DOM and bind the exact recipe id rather than trusting this document as production evidence.

- recipe 24 (Alchemy): 정신의 비약, 초급 Lv. 1; ingredients 1 맑은 액체 시약 / 4 물푸레나무 수액 / 3 정제수 / 3 정신력 회복제(소형); base output 1~4; random output 1~2.
- recipe 169 (Cooking): 발레노스 정식, 숙련 Lv. 6; cheese gratin route; base output 1~4; random output 1~2.
- recipe 637 (Cooking): 발레노스 정식, 초급 Lv. 1; first ingredient 쫀득한 치즈 그라탱 x1, remaining route quantities 1/1/2/2; base output x1; random output x1.
- recipe 221 (Cooking, supplemental catalog gap): 숙련 Lv. 1; 이국의 곡주 x2 + 양파 x3 + 마늘 x3 + 식초 x2; the item card publishes no output. The calculator currently shows one anonymous `1 x` product row before the four identified ingredient rows. That anonymous product quantity is not a fifth ingredient and must not trip the partial-ingredient guard.
- recipes 343/345/346 are historical Codex gap-page parser anchors only. They are excluded from the current catalog; 342-346 are additionally covered by reviewed retired-route evidence. Their stale no-output/random-only DOM shapes must not be described as current production recipes.
- recipe 344 remains the partial-evidence negative anchor: one exact ingredient identity is published while the calculator exposes additional anonymous ingredient quantities, so parsing must fail closed before reviewed retired-route state is applied.

Production rule: independently complete current catalog evidence plus reviewed route-state evidence and live collector output are authoritative together. A surviving Codex detail page, search-engine cache, or this regression note must never by itself establish a current production route or synthesize deterministic yield.
