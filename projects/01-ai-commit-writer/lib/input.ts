import type { FollowUpQuestion, QuestionCategory } from "@/lib/generate";

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  reason: "[작업 목적]",
  troubleshooting: "[트러블슈팅]",
  next: "[다음 계획]",
};

/** 작업 내용, AI 질문 답변, 트러블슈팅을 API 입력 형식으로 조합합니다. */
export function buildCombinedInput(
  work: string,
  questions: FollowUpQuestion[],
  answers: Record<string, string>,
  troubleshooting?: string,
): string {
  const sections = [`[오늘 작업]\n${work.trim()}`];

  for (const question of questions) {
    const answer = answers[question.id]?.trim();
    if (!answer) continue;
    sections.push(`${CATEGORY_LABELS[question.category]}\n${answer}`);
  }

  if (troubleshooting?.trim()) {
    sections.push(`[트러블슈팅]\n${troubleshooting.trim()}`);
  }

  return sections.join("\n\n");
}
