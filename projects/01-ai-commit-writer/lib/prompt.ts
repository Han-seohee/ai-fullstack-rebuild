export { SYSTEM_PROMPT } from "@/lib/prompts/system";
export { DETAIL_SYSTEM_PROMPT } from "@/lib/prompts/detail";

/** Responses API json_object 모드: input 메시지에 'json' 키워드가 포함되어야 합니다. */
export const JSON_RESPONSE_INSTRUCTION =
  "반드시 JSON 형식(JSON object)으로만 응답하세요.";

export function buildUserInput(workContent: string): string {
  return `오늘 작업한 내용:\n\n${workContent}\n\n위 내용을 바탕으로 commitMessage, journal, troubleshooting을 JSON 객체로 생성하세요.\n사용자가 입력한 사실만 정리하세요. 입력에 없는 구현 내용(색상, 폰트, 아이콘, 라이브러리, A/B 테스트 등)은 추가하지 마세요.\n${JSON_RESPONSE_INSTRUCTION}`;
}

export function buildDetailUserInput(
  workContent: string,
  journal: {
    context: string;
    decision: string;
    outcome: string;
    next: string;
  },
): string {
  return `원본 사용자 입력:

${workContent}

현재 초안 개발일지:

- context: ${journal.context}
- decision: ${journal.decision}
- outcome: ${journal.outcome}
- next: ${journal.next}

위 **원본 사용자 입력만**을 근거로 context, decision, outcome을 더 읽기 쉽게 다시 정리하세요.
새로운 사실·구현 내용을 추가하지 마세요. 문장 표현은 다듬을 수 있지만, 내용(사실)을 늘리는 것은 금지입니다.
초안에 원본 입력에 없는 내용(색상, 폰트, 아이콘, A/B 테스트, 사용자 피드백 등)이 있으면 제거하세요.
입력이 짧으면 짧게 유지하고, 정보가 부족하면 "기록되지 않음"을 사용하세요. 일기 형식(평서형)으로 작성하세요.
next는 "${journal.next}" 값을 그대로 유지하세요.
${JSON_RESPONSE_INSTRUCTION}`;
}
