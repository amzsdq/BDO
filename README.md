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

프로덕션 번들 검증:

```bash
npm test
npm run build
```

`npm run dev`가 출력한 로컬 주소를 브라우저에서 열면 됩니다. production dataset이 아직 설치되지 않은 개발 checkout에서는 앱이 synthetic sample fallback을 명시적으로 표시합니다.

## production dataset 파이프라인

라이브 클라이언트 추출물 `items.json`과 `recipes.json`을 준비한 뒤:

```bash
npm run data:import -- --items <items.json> --recipes <recipes.json> --out <dataset.json> --source-revision <extractor-tag-or-sha>
npm run data:validate -- <dataset.json>
npm run data:reconcile -- --dataset <dataset.json> --codex <codex-manifest.json> --out <reconciliation-report.json>
npm run data:release-gate -- <dataset.json> <reconciliation-report.json>
```

`data:release-gate`가 통과하지 않은 dataset은 릴리스 데이터가 아닙니다. 특히 `COMPLETE_VERIFIED`, 실제 fingerprint/count 일치, 아이콘/한국어 이름 해소, 그리고 `ZERO_UNEXPLAINED_DIFF` Codex reconciliation이 필요합니다.

현재 검토한 extractor 계약과 획득 경로는 `docs/EXTRACTOR-CONTRACT.md`, 전체 completeness 규칙은 `docs/DATA-COMPLETENESS.md`를 참고하세요.

## 현재 릴리스 상태

아직 PROGRAM_COMPLETE가 아닙니다. 현재 저장소의 sample 데이터는 계산 엔진/레이아웃 검증용이며, exhaustive live-client Cooking/Alchemy dataset이 위 gate를 통과하기 전에는 실제 릴리스를 허용하지 않습니다.
