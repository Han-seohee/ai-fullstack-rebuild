# Prompt 문서

AI Dev Assistant의 Prompt 구조와 작성 원칙을 정리합니다.
코드는 `lib/prompts/`에, 사용자 입력 조립은 `lib/prompt.ts`에 있습니다.

현재 버전: **v7** (`lib/prompts/shared.ts`의 `PROMPT_VERSION`)

---

## Prompt 구조

Generate API(`/api/generate`)는 system prompt와 user prompt를 조합해 OpenAI Responses API(`json_object` 모드)를 호출합니다.

```
buildGenerateSystemPrompt()     ← lib/prompts/index.ts
  ├── shared   (역할, 사실 제한, 출력 형식, JSON 규칙)
  ├── commit   (Conventional Commits, 이중 언어 규칙, few-shot 1–2)
  ├── journal  (context/decision/outcome/next 가이드)
  ├── detail   (troubleshooting 규칙, few-shot 3–5)
  └── few-shot 예시 + JSON 출력 규칙

buildUserInput(input)           ← lib/prompt.ts
  └── 작업 내용 + JSON 출력 지시
```

Analyze API(`/api/analyze`)는 별도 system prompt(`lib/prompts/analyze.ts`)를 사용합니다.

### API 응답 형식 (v7)

```json
{
  "commit": {
    "ko": "refactor: prompt 모듈을 역할별로 분리",
    "en": "refactor: split prompt modules by responsibility"
  },
  "journal": {
    "context": "...",
    "decision": "...",
    "outcome": "...",
    "next": "..."
  },
  "troubleshooting": null
}
```

---

## shared

**파일:** `lib/prompts/shared.ts`

| 섹션 | 역할 |
|------|------|
| `GENERATE_ROLE` | AI 역할 정의 — 창작이 아닌 **정리** |
| `FACT_RESTRICTION_RULES` | 창작 금지 vs 정리 허용 기준 |
| `CORE_PRINCIPLES` | 회고체, 필드 분리, JSON만 반환 |
| `OUTPUT_FORMAT` | JSON 스키마 |
| `JSON_OUTPUT_RULES` | OpenAI json_object 모드용 영문 지시 |

---

## commit

**파일:** `lib/prompts/commit.ts`

- Conventional Commits 형식 (`type: description`)
- 여러 작업 입력 시 **가장 영향도 큰 변경 하나**를 제목으로 선택
- description은 추상적 요약 대신 **핵심 변경 행위·대상**을 구체적으로
- `COMMIT_BILINGUAL_RULE`: `commit.ko` + `commit.en` 동시 생성
  - ko: 한국어 description
  - en: 영어 description (한글 금지)
  - journal/troubleshooting은 항상 한국어
- Few-shot 예시 1–2

---

## journal

**파일:** `lib/prompts/journal.ts`

| 필드 | 작성 방향 |
|------|-----------|
| **context** | 입력 반복 금지. 왜 이 작업을 하게 되었는지, 입력 사실을 하나의 흐름으로 연결 |
| **decision** | 사용자가 실제 선택·결정한 내용만. 입력에 없는 선택 창작 금지 |
| **outcome** | 완료한 작업 정리. 효과·성과·성능·유지보수성 등 입력에 없는 결과 금지 |
| **next** | 사용자가 입력한 다음 계획만. 없으면 `"기록되지 않음"` |

`JOURNAL_FORBIDDEN_PHRASES`: context/decision/outcome에서 "기록되지 않음" 등 메타 표현 금지 (next 제외)

---

## detail

**파일:** `lib/prompts/detail.ts`

- `[트러블슈팅]` 섹션이 있을 때만 `troubleshooting` 객체 생성, 없으면 `null`
- cause / solution / learned: 입력에 없으면 `"기록되지 않음"`
- 추측·임의 판단 금지
- Few-shot 예시 3–5

---

## analyze

**파일:** `lib/prompts/analyze.ts`

Wizard 1단계에서 작업 내용을 분석해 follow-up 질문(최대 3개)을 생성합니다.

- category: `reason` | `next` (troubleshooting은 UI 별도 수집)
- 선택형 4지선다
- 정보가 충분하면 `questions: []`

---

## Prompt 작성 원칙

1. **정리 우선, 창작 금지** — 입력에 없는 사실·효과·계획·구현을 추가하지 않습니다.
2. **필드별 역할 분리** — context / decision / outcome / next는 같은 문장을 반복하지 않고 각각 다른 관점으로 작성합니다.
3. **Few-shot은 행동 예시** — 규칙을 보완하는 구체적 입·출력 쌍을 제공합니다. 규칙과 충돌 시 규칙이 우선입니다.
4. **모듈 단위 유지** — shared / commit / journal / detail / analyze를 역할별 파일로 분리하고 `index.ts`에서 조합합니다.
5. **변경 이력은 CHANGELOG.md** — 버전별 md 파일(v1.md 등)은 만들지 않고 Git + CHANGELOG로 관리합니다.
6. **json_object 호환** — user input에 `JSON` 키워드 포함 (`JSON_RESPONSE_INSTRUCTION`).

### 수정 시 체크리스트

- [ ] `OUTPUT_FORMAT`과 few-shot 출력 형식이 일치하는가?
- [ ] `lib/generate.ts` 타입·API route 검증과 일치하는가?
- [ ] journal next 필드의 `"기록되지 않음"` 규칙이 유지되는가?
- [ ] troubleshooting `"기록되지 않음"` 규칙이 유지되는가?
- [ ] CHANGELOG.md에 변경 내용을 기록했는가?
