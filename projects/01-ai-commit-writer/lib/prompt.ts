import {
  type CommitLanguage,
  DEFAULT_COMMIT_LANGUAGE,
} from "@/lib/generate";
import { JSON_RESPONSE_INSTRUCTION } from "@/lib/prompts/shared";

const COMMIT_LANGUAGE_INSTRUCTIONS: Record<CommitLanguage, string> = {
  ko: `commitLanguage: "ko"
commitMessage MUST be written in Korean.
journal과 troubleshooting MUST be written in Korean.`,
  en: `commitLanguage: "en"
commitMessage MUST be written in English only. Translate Korean input into English for the commit description.
Do NOT use Korean characters (한글) in commitMessage.
journal과 troubleshooting MUST be written in Korean.`,
};

export function buildAnalyzeUserInput(work: string): string {
  return `오늘 작업한 내용:\n\n${work}\n\n위 작업 내용을 분석해, 개발일지 작성에 부족한 맥락만 follow-up 질문으로 JSON 객체에 담아 반환하세요.\n질문은 최대 3개입니다. 트러블슈팅은 UI에서 별도로 수집하므로 질문하지 마세요.\n${JSON_RESPONSE_INSTRUCTION}`;
}

export function buildUserInput(
  workContent: string,
  commitLanguage: CommitLanguage = DEFAULT_COMMIT_LANGUAGE,
): string {
  return `${COMMIT_LANGUAGE_INSTRUCTIONS[commitLanguage]}

오늘 작업한 내용:

${workContent}

위 내용을 바탕으로 commitMessage, journal, troubleshooting을 JSON 객체로 생성하세요.
입력 문장을 그대로 복사하지 말고, 입력 사실만 바탕으로 자연스럽게 정리하세요. 입력에 없는 효과·성과·계획·구체적 구현(색상, 폰트, A/B 테스트, 사용자 피드백 등)은 추가하지 마세요.
${JSON_RESPONSE_INSTRUCTION}`;
}
