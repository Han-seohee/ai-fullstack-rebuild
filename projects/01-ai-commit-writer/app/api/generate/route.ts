import { NextResponse } from "next/server";
import OpenAI from "openai";

import type { GenerateResult } from "@/lib/generate";
import { SYSTEM_PROMPT, buildUserInput } from "@/lib/prompt";

type GenerateRequestBody = {
  input?: string;
};

/**
 * POST /api/generate
 *
 * App Router의 Route Handler로 서버 엔드포인트를 둡니다.
 * OpenAI 호출은 서버에서만 수행하므로, API 키를 클라이언트에 노출하지 않고
 * 프론트는 이 경로로만 통신합니다.
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as GenerateRequestBody;
    const input = (body.input ?? "").trim();

    // 클라이언트 검증을 우회한 빈 요청을 서버에서도 거절합니다.
    if (!input) {
      return NextResponse.json(
        { error: "입력 내용을 작성해주세요." },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: SYSTEM_PROMPT,
      input: buildUserInput(input),
      text: {
        format: { type: "json_object" },
      },
    });

    const content = response.output_text;
    if (!content) {
      throw new Error("OpenAI 응답이 비어 있습니다.");
    }

    const result = JSON.parse(content) as GenerateResult;

    const troubleshooting = result.troubleshooting;
    const isValidTroubleshooting =
      troubleshooting === null ||
      (typeof troubleshooting === "object" &&
        typeof troubleshooting.problem === "string" &&
        typeof troubleshooting.cause === "string" &&
        typeof troubleshooting.solution === "string" &&
        typeof troubleshooting.learned === "string");

    if (
      typeof result.commitMessage !== "string" ||
      !result.journal ||
      typeof result.journal.context !== "string" ||
      typeof result.journal.decision !== "string" ||
      typeof result.journal.outcome !== "string" ||
      typeof result.journal.next !== "string" ||
      !isValidTroubleshooting
    ) {
      throw new Error("OpenAI 응답 형식이 올바르지 않습니다.");
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/generate]", error);
    return NextResponse.json(
      { error: "생성 요청에 실패했습니다." },
      { status: 500 },
    );
  }
}
