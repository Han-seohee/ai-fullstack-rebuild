export { SYSTEM_PROMPT } from "@/lib/prompts/system";
export { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts/analyze";

/** Responses API json_object 모드: input 메시지에 'json' 키워드가 포함되어야 합니다. */
export const JSON_RESPONSE_INSTRUCTION =
  "반드시 JSON 형식(JSON object)으로만 응답하세요.";

export function buildAnalyzeUserInput(work: string): string {
  return `오늘 작업한 내용:\n\n${work}\n\n위 작업 내용을 분석해, 개발일지 작성에 부족한 맥락만 follow-up 질문으로 JSON 객체에 담아 반환하세요.\n질문은 최대 3개입니다. 트러블슈팅은 UI에서 별도로 수집하므로 질문하지 마세요.\n${JSON_RESPONSE_INSTRUCTION}`;
}

export function buildUserInput(workContent: string): string {
  return `오늘 작업한 내용:\n\n${workContent}\n\n위 내용을 바탕으로 commitMessage, journal, troubleshooting을 JSON 객체로 생성하세요.\n입력을 요약·반복하지 말고, 개발자가 직접 쓴 회고처럼 자연스럽게 작성하세요. 입력에 없는 구체적 구현(색상, 폰트, 아이콘, 라이브러리, A/B 테스트, 사용자 피드백 등)은 추가하지 마세요.\n${JSON_RESPONSE_INSTRUCTION}`;
}
