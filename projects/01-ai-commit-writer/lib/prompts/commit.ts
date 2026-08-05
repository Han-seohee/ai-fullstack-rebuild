/**
 * Commit message prompt — Conventional Commits 규칙 및 few-shot (예시 1–2)
 */

export const COMMIT_PROMPT = `## 커밋 메시지 규칙

Conventional Commits 형식: \`type: description\` 또는 \`type(scope): description\`

### 가장 영향도 큰 변경 하나를 제목으로 선택

[오늘 작업]에 여러 항목이 있어도 **첫 번째 항목을 그대로 쓰지 마세요**.
전체 입력을 보고 **프로젝트에서 가장 의미 있는 변경 하나**를 골라 제목으로 씁니다.

**우선순위** (높은 것부터):

1. **기능 추가** → \`feat:\`
2. **구조 변경** (아키텍처·모듈 분리·API 구조 등) → \`feat:\` 또는 \`refactor:\`
3. **UX 개선** (로딩·피드백·입력 흐름 등) → \`feat:\` 또는 \`refactor:\`
4. **리팩토링** (동작 변경 없는 정리) → \`refactor:\`
5. **문서** → \`docs:\`

### description은 핵심 변경을 구체적으로

추상적·포괄적인 한 단어 요약은 피하고, **입력에서 확인 가능한 핵심 작업**이 드러나게 씁니다.

**나쁜 예** (너무 포괄적):
- \`refactor: prompt 코드 분리\`
- \`feat: UI 개선\`
- \`refactor: 코드 개선\`

**좋은 예** (핵심 변경이 드러남):
- 입력: Prompt를 shared, commit, journal 파일로 분리 → \`refactor: split prompt modules by responsibility\`
- 입력: Prompt 역할별 모듈 분리 → \`refactor: modularize prompt generation logic\`
- 입력: Skeleton UI, Toast, localStorage 자동 저장 → \`feat: add localStorage auto-save and generation history\`
- 입력: OpenAI API 연동, Prompt 분리, Route Handler → \`feat: integrate OpenAI API and split prompt modules\`

- **description**: 선택한 변경의 **구체적 행위·대상**을 한 줄로 요약합니다.
- 입력에 없는 구현·기능·파일명을 추가하지 마세요.`;

export const COMMIT_BILINGUAL_RULE = `## commit — 한국어·영어 동시 생성 (필수)

commit 객체에 **ko**와 **en** 두 버전을 **항상 함께** 작성합니다.

- **ko**: Conventional Commits 형식, description은 **한국어**
- **en**: Conventional Commits format, description은 **영어만** (한글 금지)
- 두 버전은 **같은 type·scope·의미**를 전달합니다. ko와 en은 번역 관계입니다.
- 입력이 한국어여도 en description은 영어로 작성합니다.
- journal과 troubleshooting은 **항상 한국어**입니다.`;

export const COMMIT_FEW_SHOT = `### 예시 1 — Prompt 분리 (짧은 입력, 정리)

**입력:**
\`\`\`
[오늘 작업]
Prompt를 shared, commit, journal 파일로 분리했다.
\`\`\`

**출력:**
\`\`\`json
{
  "commit": {
    "ko": "refactor: prompt 모듈을 역할별로 분리",
    "en": "refactor: split prompt modules by responsibility"
  },
  "journal": {
    "context": "프롬프트 관련 코드가 하나의 파일에 모여 있어, 역할별로 나누는 작업을 진행했다.",
    "decision": "shared, commit, journal 역할별로 파일을 나누기로 했다.",
    "outcome": "Prompt를 shared, commit, journal 세 파일로 나누어 각 역할별 수정 위치를 분리했다.",
    "next": "기록되지 않음"
  },
  "troubleshooting": null
}
\`\`\`

### 예시 2 — API 연동 (여러 입력, 필드별 관점 분리)

**입력:**
\`\`\`
[오늘 작업]
OpenAI Responses API 연동
Prompt를 lib/prompt.ts로 분리
Route Handler에서 서버 사이드 호출

[작업 목적]
Mock 응답을 실제 API로 교체해 End-to-end 흐름 검증
\`\`\`

**출력:**
\`\`\`json
{
  "commit": {
    "ko": "feat: OpenAI API 연동 및 prompt 모듈 분리",
    "en": "feat: integrate OpenAI API and split prompt modules"
  },
  "journal": {
    "context": "Mock 응답만으로는 실제 흐름을 검증하기 어려워, 이번 작업에서 실제 API를 붙이는 것을 목표로 잡았다.",
    "decision": "호출은 Route Handler에서 서버 사이드로 처리하고, Prompt는 lib/prompt.ts로 분리하기로 했다.",
    "outcome": "OpenAI Responses API 연동, Prompt 모듈 분리, Route Handler 서버 사이드 호출까지 반영했다.",
    "next": "Mock을 실제 API로 교체해 End-to-end 흐름을 검증하는 작업을 진행 중이다."
  },
  "troubleshooting": null
}
\`\`\``;
