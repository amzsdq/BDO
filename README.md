# BDO 생활 준비 플래너

검은사막의 요리·연금 제작 목표를 **재료 준비 행동**으로 바꾸는 한국어 우선 웹 플래너입니다.

현재 개발 목표:
- 목표 완성품 수량 또는 요리/연금 도구 사용 횟수 기준 계산
- 중간재 재귀 전개 및 제작/외부조달 선택
- 보유량/부족량과 체크리스트
- 숙련도·무게 기반 배치 준비
- 전체 요리·연금 레시피 completeness gate
- 아이템 이미지
- 좋은 UX를 release blocker 수준으로 검증
- 1차 핵심 완성 후 KR 중앙거래소 연동

## 로컬 실행

Node.js 22 기준입니다.

```bash
npm install
npm run dev
```

프로덕션 번들 검증 (main 및 relay 개발 브랜치는 GitHub CI에서도 동일 검증을 실행합니다):

```bash
npm test
npm run build
```

`npm run dev`가 출력한 로컬 주소를 브라우저에서 열면 됩니다. production dataset이 아직 설치되지 않은 개발 checkout에서는 앱이 synthetic sample fallback을 명시적으로 표시합니다.

## production dataset 파이프라인

자동 획득 스크립트 `scripts/bootstrap-production-data.ps1`는 현재 검토된 extractor revision이 요구하는 Go 1.26 이상과 Node/npm을 필요로 합니다. `--source-revision`에는 임의 tag나 다른 commit이 아니라 저장소의 `production-source-contract.mjs`에 명시된 reviewed exact revision만 사용할 수 있습니다. Client fingerprint는 임의 실행 파일 해시가 아니라 extractor와 동일한 `Paz/pad00000.meta` + 존재할 경우 `ads_version` byte stream의 SHA-256입니다.

라이브 클라이언트 추출물 `items.json`, `recipes.json`, `mastery.json`, 그리고 `bdo-data-extractor icons`가 `<extractor-data>/asset_redirects.json`에 기록한 `urn::item:<id> -> icons/<shared-asset>.webp` redirect 및 그 redirect가 가리키는 decoded WebP 자산을 준비합니다. runtime이 실제로 읽는 dataset과 브라우저가 실제로 제공하는 icon asset을 함께 설치합니다. Codex reconciliation 전에 Cooking/Alchemy 카탈로그 전체를 독립적으로 수집하고 completeness가 증명된 `<codex-catalog.json>` artifact를 보존해야 합니다. 부분 manifest끼리 서로 일치하는 것만으로는 release gate를 통과할 수 없습니다.

기본 구조 import는 extractor가 한국어를 제공하지 않으므로 의도적으로 `아이템 #<id>` placeholder를 만듭니다. 따라서 import 직후 BDO Codex KR item-id 증거를 적용하는 단계가 필수입니다. 이 단계를 생략한 dataset은 promotion이 거부됩니다.

```bash
node scripts/prepare-client-broad-from-snapshot.mjs <bootstrap-snapshot-dir> <client-broad.json>
# Or, from separately verified raw files:
npm run data:import:broad -- --items <items.json> --recipes <recipes.json> --out <client-broad.json> --source-revision <reviewed-extractor-sha> --client-fingerprint <client-fingerprint>
```

Do not use the bootstrap script's legacy scoped `client-dataset.json` as the production entry point. Preserve the broad graph until reviewed retired-route pruning, Codex random-output normalization/binding, yield enrichment, substitution evidence, and final scope selection have run. Korean name evidence is applied after final scope selection using the final exact item-evidence pass.

`<korean-name-evidence.json>`은 canonical item id별 한국어 이름과 `https://bdocodex.com/kr/item/<id>/` 증거 URL을 포함해야 하며, 중복 item id·알 수 없는 item id·placeholder 이름·item id와 맞지 않는 URL은 fail closed 합니다. 모든 planner-scoped item의 이름이 해소되어야 `metadata.koreanNamesVerified=true`가 됩니다. 부분 증거는 중간 작업에는 사용할 수 있지만 production promotion은 통과하지 못합니다.

Codex 재료 그룹을 사용하는 production import에서는 recipe evidence에서 명시적인 material-group id를 추출하고, KR Codex의 행 단위 Worth 증거를 수집한 뒤 substitution evidence를 적용합니다. Worth가 누락되거나 그룹 멤버와 정확히 일치하지 않으면 검증이 실패합니다. 추측 비율은 허용하지 않습니다.

```bash
node scripts/codex-material-group-ids.mjs <codex-recipe-evidence.json>
node scripts/collect-codex-substitution-groups.mjs --groups <3001,6002,...> --out <codex-substitutions.json>
node scripts/apply-substitution-evidence.mjs public/data/dataset.json <codex-substitutions.json> public/data/dataset.json
```

숙련도 증거는 production client의 `mastery.json`에 extractor revision, client fingerprint, extraction timestamp를 결합해 보존합니다. 구조만 맞는 raw mastery 파일은 릴리스 증거가 아닙니다. Cooking/Alchemy raw columns가 검증된 semantic mapping을 거쳐 현재 runtime mastery curve와 모두 일치한 cross-check PASS artifact만 최종 gate에 사용할 수 있습니다.

```bash
npm run data:mastery-evidence -- --mastery <mastery.json> --out <mastery-evidence.json> --source-revision <reviewed-extractor-sha> --client-fingerprint <client-fingerprint> --extracted-at <iso-timestamp>
```

현재 evidence generator는 raw client mastery의 검증된 semantic channel mapping을 적용한 뒤, checked-in Cooking/Alchemy runtime curve와 deterministic cross-check를 수행합니다. 두 skill의 의미 매핑과 curve가 모두 일치할 때만 `releaseReady=true`를 출력하며, 불일치·미확인 channel·구조 오류는 fail closed 합니다. 최종 gate는 evidence에 기록된 SHA-256을 전달된 원본 `mastery.json` 바이트와 다시 계산·대조하여 다른 client snapshot의 evidence 재사용도 거부합니다.

이후 release gate:

```bash
npm run data:codex:browser -- --out <codex-catalog.json>
npm run data:codex:details -- --catalog <codex-catalog.json> --out <codex-details.json> --probe-gaps true
npm run data:codex:items -- --details <codex-details.json> --out <codex-initial-item-evidence.json> --concurrency 6 --retries 2
node scripts/codex-material-group-ids.mjs <codex-initial-item-evidence.json>
npm run data:codex:groups -- --groups <discovered-group-ids> --out <codex-substitutions.json>
npm run data:codex:normalize-random -- <client-broad.json> <codex-details.json> <client-normalized.json>
npm run data:codex:bind -- <client-normalized.json> <codex-details.json> <bound-yield-evidence.json> <codex-initial-item-evidence.json>
npm run data:yields -- <client-normalized.json> <bound-yield-evidence.json> <client-enriched.json>
npm run data:scope:finalize -- <client-enriched.json> <client-scoped.json> <codex-substitutions.json>
npm run data:codex:items -- --dataset <client-scoped.json> --out <codex-final-item-evidence.json> --concurrency 6 --retries 2
node scripts/apply-korean-name-evidence.mjs <client-scoped.json> <codex-final-item-evidence.json> public/data/dataset.json
npm run data:icons -- public/data/dataset.json <extractor-data> public/icons
npm run data:icons:verify -- public/data/dataset.json public/icons/icon-manifest.json public/icons
npm run data:validate -- public/data/dataset.json
npm run data:reconcile -- --dataset public/data/dataset.json --codex <codex-details.json> --out <reconciliation-report.json>
npm run data:promote -- public/data/dataset.json <reconciliation-report.json> <codex-catalog.json> <codex-details.json>
npm run data:release-gate -- public/data/dataset.json <reconciliation-report.json> <codex-catalog.json> <codex-details.json> <mastery-evidence.json> <mastery.json> <release-e2e-evidence.json>
```

`release-e2e-evidence.json`은 `docs/E2E-ACCEPTANCE.md`의 E2E-01~09 전체 PASS를 exact release commit과 production dataset/reconciliation/mastery fingerprints에 묶는 fail-closed 증거입니다. 작성 형식과 검증 명령은 `docs/RELEASE-E2E-EVIDENCE.md`를 참고하세요. placeholder/TODO 값이나 현재 checkout과 다른 `mainCommit`은 최종 gate에서 거부됩니다.

`<codex-catalog.json>`은 completeness/count/recipe-id 증거이고, `data:reconcile`의 `<codex-manifest.json>`은 recipe별 output/ingredient 상세 증거입니다. 두 artifact는 역할이 다르므로 catalog ID 목록을 상세 reconciliation manifest처럼 재사용하면 안 됩니다.

`data:codex:browser`는 실제 KR Cooking/Alchemy catalog 페이지를 열고 skill-scoped recipe XHR을 캡처합니다. 서버가 total을 제공하면 같은 transport를 끝까지 paginate하고, total이 없는 unpaginated full-array 응답은 렌더링된 recipe-id 집합과 교차검증합니다. product-scoped/부분 endpoint나 단순 non-empty 응답은 complete catalog 증거가 아닙니다. promotion과 최종 release gate는 complete catalog의 총 recipe page 수와 정확한 recipe-id set이 reconciliation report와 일치하는지 다시 검증합니다.

`data:icons`는 extractor의 `asset_redirects.json`에서 `urn::item:<itemId>` redirect를 해석해 dataset이 참조하는 canonical `icons/<itemId>.webp`로 설치합니다. 필요한 redirect나 decoded WebP 하나라도 빠져 있으면 실패하며, source DDS 경로를 브라우저 asset 경로로 취급하지 않습니다.

`data:promote`는 `ZERO_UNEXPLAINED_DIFF`, 독립 Codex catalog completeness, Cooking/Alchemy count 일치, 한국어 이름과 아이콘 해소를 확인한 뒤에만 `COMPLETE_VERIFIED` 상태와 새 fingerprint를 기록합니다. promotion은 reconciliation에 기록된 exact Codex detail manifest SHA-256도 dataset metadata에 결속합니다. 그 다음 `data:release-gate`가 결과와 catalog/detail evidence를 독립적으로 다시 검증하고 production mastery evidence의 semantic cross-check PASS, exact snapshot binding, E2E-01~09의 exact-commit evidence까지 요구합니다. 어느 하나라도 통과하지 않은 dataset은 릴리스 데이터가 아닙니다.

현재 검토한 extractor 계약과 획득 경로는 `docs/EXTRACTOR-CONTRACT.md`, 전체 completeness 규칙은 `docs/DATA-COMPLETENESS.md`, 숙련도 증거 규칙은 `docs/MASTERY_DATA_POLICY.md`를 참고하세요.

## 현재 릴리스 상태

아직 PROGRAM_COMPLETE가 아닙니다. 현재 저장소의 sample 데이터는 계산 엔진/레이아웃 검증용이며, exhaustive live-client Cooking/Alchemy dataset과 production mastery cross-check 및 실제 release E2E evidence가 위 gate를 통과하기 전에는 실제 릴리스를 허용하지 않습니다.
