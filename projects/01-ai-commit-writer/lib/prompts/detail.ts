/**
 * Detail (troubleshooting) prompt — 트러블슈팅 필드 규칙 및 few-shot (예시 3–5)
 */

export const DETAIL_PROMPT = `## troubleshooting 필드 — 엄격 규칙 (최우선)

troubleshooting은 [트러블슈팅] 섹션이 **있고 내용이 비어 있지 않을 때만** 작성합니다.
없으면 **null**을 반환하세요.

**추측 금지**. 입력에 없는 원인·해결·배운 점을 지어내지 마세요.
**"미해결"**, **"원인 확인 중"** 등 해결 여부를 AI가 임의로 판단해 쓰지 마세요.

| 필드 | 규칙 |
|------|------|
| **problem** | 사용자가 입력한 에러·문제 내용을 **정리**합니다. |
| **cause** | 입력에서 **원인을 알 수 있는 경우에만** 작성합니다. 에러 메시지 자체가 원인을 명시하는 경우 포함. 알 수 없으면 **"기록되지 않음"** |
| **solution** | 사용자가 **해결 방법·수정 내용을 입력한 경우에만** 작성합니다. 없으면 **"기록되지 않음"** |
| **learned** | 사용자가 **해결 과정·시도·깨달음을 입력한 경우에만** 작성합니다. 없으면 **"기록되지 않음"** |

**"기록되지 않음"**은 troubleshooting의 cause·solution·learned에서만 사용합니다.`;

export const DETAIL_FEW_SHOT = `### 예시 3 — 에러 메시지만 입력 (해결 방법 없음)

**입력:**
\`\`\`
[오늘 작업]
detail API JSON 모드 400 에러 수정

[트러블슈팅]
POST /api/generate/detail 400
Response input messages must contain the word 'json'
\`\`\`

**출력:**
\`\`\`json
{
  "commit": {
    "ko": "fix: detail API JSON 모드 400 에러",
    "en": "fix: resolve detail API JSON mode 400 error"
  },
  "journal": {
    "context": "detail API 호출 시 400 에러가 발생해, JSON 모드 관련 설정을 점검하는 작업을 시작했다.",
    "decision": "에러 메시지를 단서로 input 메시지 쪽을 먼저 확인하기로 했다.",
    "outcome": "400 에러와 'json' 키워드 관련 메시지를 확인했고, 원인 추적을 진행 중이다.",
    "next": "detail API JSON 모드 400 에러 수정 작업을 이어가고 있다."
  },
  "troubleshooting": {
    "problem": "POST /api/generate/detail 400. OpenAI 응답: Response input messages must contain the word 'json'",
    "cause": "json_object 출력 형식 사용 시 input 메시지에 'json' 키워드가 필요하다는 에러 메시지",
    "solution": "기록되지 않음",
    "learned": "기록되지 않음"
  }
}
\`\`\`

### 예시 4 — 원인·해결 모두 미입력

**입력:**
\`\`\`
[오늘 작업]
OpenAI 응답 품질 개선

[트러블슈팅]
detail API가 입력에 없는 A/B 테스트 내용을 생성함
아직 원인 파악 중
\`\`\`

**출력:**
\`\`\`json
{
  "commit": {
    "ko": "fix: detail API 응답 품질 개선",
    "en": "fix: improve detail API response quality"
  },
  "journal": {
    "context": "detail API 결과가 입력과 맞지 않는 경우가 있어, 응답 품질을 점검하는 작업을 시작했다.",
    "decision": "입력에 없는 내용이 생성되는 현상부터 재현하고 원인을 좁히기로 했다.",
    "outcome": "A/B 테스트 등 입력에 없는 내용이 생성되는 현상을 확인했고, 원인 파악을 진행 중이다.",
    "next": "아직 원인 파악 중인 상태로, 트러블슈팅을 이어가고 있다."
  },
  "troubleshooting": {
    "problem": "detail API가 입력에 없는 A/B 테스트 내용을 생성함. 아직 원인 파악 중.",
    "cause": "기록되지 않음",
    "solution": "기록되지 않음",
    "learned": "기록되지 않음"
  }
}
\`\`\`

### 예시 5 — 해결 방법까지 입력된 경우

**입력:**
\`\`\`
[오늘 작업]
detail API JSON 모드 400 에러 수정

[트러블슈팅]
POST /api/generate/detail 400 — json 키워드 누락
buildDetailUserInput에 JSON 출력 안내 문구 추가해서 해결
Responses API json_object 모드는 input에 json 키워드 필요
\`\`\`

**출력:**
\`\`\`json
{
  "commit": {
    "ko": "fix: detail API JSON 모드 input 키워드 누락 수정",
    "en": "fix: add missing json keyword in detail API input"
  },
  "journal": {
    "context": "detail API 400 에러가 반복돼 json_object 모드 조건을 점검했다.",
    "decision": "generate API와 동일하게 buildDetailUserInput에 JSON 출력 안내 문구를 추가하기로 했다.",
    "outcome": "buildDetailUserInput에 JSON 출력 안내 문구를 추가해 detail API 400 에러를 해결했다.",
    "next": "기록되지 않음"
  },
  "troubleshooting": {
    "problem": "POST /api/generate/detail 400 — json 키워드 누락",
    "cause": "json_object 출력 형식 사용 시 input 메시지에 'json' 키워드가 없었음",
    "solution": "buildDetailUserInput에 JSON 출력 안내 문구 추가",
    "learned": "Responses API json_object 모드는 input에 json 키워드가 필요하다"
  }
}
\`\`\``;
