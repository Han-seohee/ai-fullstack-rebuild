# Prompt CHANGELOG

Prompt 변경 이력입니다. Git이 상세 diff를 관리합니다.

---

## 2026-08-05

- **v7**: 커밋 메시지 이중 언어 생성 (`commit.ko` + `commit.en`)
- Commit Prompt 개선 — 추상적 description 대신 핵심 변경 행위·대상을 구체적으로
- Commit Few-shot 보완 — bilingual 출력 형식 및 구체적 description 예시
- Journal Prompt 개선 — context 흐름 연결, decision/outcome 창작 금지 강화, next `"기록되지 않음"` 규칙 명확화
- Detail Few-shot 출력 형식을 `commit` 객체 구조로 통일
- Prompt 문서화 (`docs/prompt/`)

---

## 2026-08-04

- **v6**: 창작 금지 vs 정리 허용 기준 명확화
- context / decision / outcome 필드별 역할·작성 가이드 강화
- Few-shot 예시 전면 개편

---

## 2026-08-03

- Analyze Prompt 추가 (Wizard follow-up 질문)
- Detail Prompt 분리 (`lib/prompts/detail.ts`)

---

## 이전 (v1–v5)

자세한 내용은 `PROMPT_HISTORY.md`를 참고하세요.

- v5: Detail Prompt 분리, Few-shot 추가, Prompt Versioning 구조
- v4: Troubleshooting 추가
- v3: 추측 금지 규칙
- v2: Route Handler, JSON 출력 강화
- v1: 기본 JSON 생성
