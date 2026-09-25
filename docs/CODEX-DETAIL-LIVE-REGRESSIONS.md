# Codex recipe-detail live regression anchors

Validated against current BDO Codex KR pages on 2026-09-26. These anchors are for the schema-v2 detail collector; the collector must still parse the live DOM and bind the exact recipe id rather than trusting this document as production evidence.

- recipe 24 (Alchemy): 정신의 비약, 초급 Lv. 1; ingredients 1 맑은 액체 시약 / 4 물푸레나무 수액 / 3 정제수 / 3 정신력 회복제(소형); base output 1~4; random output 1~2.
- recipe 169 (Cooking): 발레노스 정식, 숙련 Lv. 6; cheese gratin route; base output 1~4; random output 1~2.
- recipe 637 (Cooking): 발레노스 정식, 초급 Lv. 1; first ingredient 쫀득한 치즈 그라탱 x1, remaining route quantities 1/1/2/2; base output x1; random output x1.
- recipe 345 (Alchemy): 예리한 파괴의 정령석, 숙련 Lv. 1; 금속 용해제 x50 + 크론석 x5; no base output; random output 예리한 파괴의 정령석 x1 => random-only.
- recipe 346 (Alchemy): 예리한 수호의 정령석, 숙련 Lv. 1; 보석 연마재 x50 + 크론석 x5; no base output; random output 예리한 수호의 정령석 x1 => random-only.
- recipe 343 (Alchemy): 숙련 Lv. 1; 투명/진흙/검은/푸른/보라수정 each x50; current page publishes no crafting-result section => no-output, not parser failure.

Production rule: live collector output with sourceUrl/collectedAt and exact catalog coverage is authoritative. Search-engine cache or this regression note must never synthesize deterministic yield.
