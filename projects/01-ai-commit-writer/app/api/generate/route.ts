import { NextResponse } from "next/server";

import { getMockResult } from "@/lib/generate";

type GenerateRequestBody = {
  input?: string;
};

/**
 * POST /api/generate
 *
 * App Router의 Route Handler로 서버 엔드포인트를 둡니다.
 * OpenAI 호출은 서버에서만 수행할 예정이므로, API 키를 클라이언트에 노출하지 않고
 * 프론트는 이 경로로만 통신합니다.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as GenerateRequestBody;
  const input = (body.input ?? "").trim();

  // 클라이언트 검증을 우회한 빈 요청을 서버에서도 거절합니다.
  if (!input) {
    return NextResponse.json(
      { error: "입력 내용을 작성해주세요." },
      { status: 400 },
    );
  }

  // OpenAI 연동 전: Mock 생성 로직은 lib/generate.ts 한곳에서만 관리합니다.
  return NextResponse.json(getMockResult(input));
}
