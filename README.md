# BDO 생활 준비 플래너

검은사막의 요리·연금 제작 목표를 **재료 준비 행동**으로 바꾸는 웹 기반 플래너입니다.

현재 개발 목표:
- 목표 완성품 수량 또는 요리/연금 도구 사용 횟수 기준 계산
- 중간재 재귀 전개
- 보유량/부족량
- 체크리스트
- 전체 요리·연금 레시피 completeness gate
- 아이템 이미지
- 좋은 UX를 release blocker 수준으로 검증
- 1차 핵심 완성 후 KR 중앙거래소 연동

## 개발

```bash
npm install
npm run dev
npm test
npm run build
```

현재 UI 데이터는 계산 엔진/레이아웃 검증용 synthetic sample입니다. 실제 릴리스는 `docs/DATA-COMPLETENESS.md`의 전체 레시피 검증을 통과하기 전에는 허용하지 않습니다.
