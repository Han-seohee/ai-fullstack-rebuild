/**
 * Commit message prompt — Conventional Commits 규칙 및 few-shot (예시 1–2)
 */

import type { CommitLanguage } from "@/lib/generate";

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

**나쁜 예** (너무 포괄적):
- \`feat: UI 개선\` (Skeleton, Toast, localStorage 등 여러 작업을 한 단어로 뭉갬)
- \`refactor: 코드 개선\`

**좋은 예** (영향도 큰 변경 하나를 구체적으로):
- 입력: Skeleton UI, Toast, localStorage 자동 저장, History → \`feat: localStorage 자동 저장 및 생성 기록\`
- 입력: OpenAI API 연동, Prompt 분리, Route Handler → \`feat: OpenAI API 연동 및 Prompt 모듈 분리\`
- 입력: Prompt를 shared, commit, journal 파일로 분리 → \`refactor: Prompt 역할별 모듈 분리\`

- **description**: 선택한 변경을 **구체적으로** 한 줄로 요약합니다.`;

/** 선택된 commitMessage 언어에 대한 강제 규칙 (few-shot 한국어 예시보다 우선) */
export function buildCommitLanguageRule(
  commitLanguage: CommitLanguage,
): string {
  if (commitLanguage === "en") {
    return `## commitMessage 언어 — English (필수)

- commitMessage description은 **반드시 영어**로 작성합니다.
- 입력이 한국어여도 commitMessage는 영어로 작성합니다. 한글을 commitMessage에 사용하지 마세요.
- 아래 few-shot 예시의 commitMessage가 한국어여도 **따르지 마세요**. 이번 요청은 English입니다.
- journal과 troubleshooting은 **항상 한국어**입니다.

영어 commitMessage 예시:
- \`refactor: modularize prompt architecture\`
- \`feat: add OpenAI API integration and split prompt modules\``;
  }

  return `## commitMessage 언어 — 한국어 (필수)

- commitMessage description은 **반드시 한국어**로 작성합니다.
- journal과 troubleshooting은 **항상 한국어**입니다.`;
}

export const COMMIT_FEW_SHOT = `### 예시 1 — Prompt 분리 (짧은 입력, 정리)

**입력:**
\`\`\`
[오늘 작업]
Prompt를 shared, commit, journal 파일로 분리했다.
\`\`\`

**출력:**
\`\`\`json
{
  "commitMessage": "refactor: Prompt 역할별 모듈 분리",
  "journal": {
    "context": "프롬프트 관련 코드가 하나의 파일에 모여 있어, 역할별로 나누는 작업을 진행했다.",
    "decision": "shared, commit, journal 역할별로 파일을 나누기로 했다.",
    "outcome": "Prompt를 shared, commit, journal 세 파일로 나누어 각 역할별 수정 위치를 분리했다.",
    "next": "이번 작업은 Prompt 구조 분리로 마무리했다."
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
  "commitMessage": "feat: OpenAI API 연동 및 Prompt 모듈 분리",
  "journal": {
    "context": "Mock 응답만으로는 실제 흐름을 검증하기 어려워, 이번 작업에서 실제 API를 붙이는 것을 목표로 잡았다.",
    "decision": "호출은 Route Handler에서 서버 사이드로 처리하고, Prompt는 lib/prompt.ts로 분리하기로 했다.",
    "outcome": "OpenAI Responses API 연동, Prompt 모듈 분리, Route Handler 서버 사이드 호출까지 반영했다.",
    "next": "Mock을 실제 API로 교체해 End-to-end 흐름을 검증하는 작업을 진행 중이다."
  },
  "troubleshooting": null
}
\`\`\``;
