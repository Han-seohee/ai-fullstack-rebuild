export type JournalEntry = {
  context: string;
  decision: string;
  outcome: string;
  next: string;
};

export type GenerateResult = {
  commitMessage: string;
  journal: JournalEntry;
};

export function getMockResult(input: string): GenerateResult {
  const topic = input.trim() || "오늘의 개발 작업";

  return {
    commitMessage:
      "feat(ui): 커밋 메시지 및 개발일지 생성 MVP 화면 추가",
    journal: {
      context: `AI Dev Assistant UI 작업. 주요 내용: ${topic.slice(0, 120)}${topic.length > 120 ? "…" : ""}`,
      decision:
        "첫날 OpenAI 연동 대신 단일 페이지 클라이언트 컴포넌트와 mock 데이터로 구성. shadcn/ui + Tailwind로 API 연동 전 UI 일관성 유지.",
      outcome:
        "두 번째 화면이나 공유 로직이 생기기 전까지 페이지는 단일 파일로 유지. mock 레이어는 lib/mock.ts에 두어 실제 API 라우트로 교체 시 한 파일만 변경하면 됨.",
      next:
        "/api/generate 라우트 추가, OpenAI 연결, getMockResult를 API 호출로 교체.",
    },
  };
}
