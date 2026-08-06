# Prompt History

Prompt 변경 이력을 기록합니다. Prompt를 수정할 때마다 새 버전을 아래에 추가하세요.

---

## v1

- 기본 JSON 생성

---

## v2

- Route Handler 대응
- JSON 출력 강화

---

## v3

- 추측 금지 규칙 추가

---

## v4

- Troubleshooting 추가

---

## v5

- Detail Prompt 분리 (`lib/prompts/detail.ts`)
- 기억 정리 방향 전환 (추측·창작 금지 강화)
- Few-shot 예시 추가 (에러 붙여넣기, 미해결, 짧은 입력)
- Prompt Versioning 구조 (`lib/prompts/`)

---

## v6 (current)

- 창작 금지 vs 정리 허용 기준 명확화 (복붙 방지 + 자연스러운 재구성 허용)
- context / decision / outcome 필드별 역할·작성 가이드 강화
- decision: 입력에 명시된 선택·이유만 / outcome: 완료 작업만 (효과·성과 금지)
- Few-shot 예시 전면 개편 (Prompt 분리 정리 예시 추가, journal 필드 관점 분리)

---

<!-- 새 버전 추가 템플릿

## v6

- 변경 내용 1
- 변경 내용 2

-->
