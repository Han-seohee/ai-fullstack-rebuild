import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  DEFAULT_COMMIT_LANGUAGE,
  type CommitLanguage,
  type GenerateResult,
  isCommitLanguage,
  isValidJournalEntry,
} from "@/lib/generate";
import { createJsonObjectCompletion } from "@/lib/openai-json";
import { buildGenerateSystemPrompt } from "@/lib/prompts/index";
import { buildUserInput } from "@/lib/prompt";

type GenerateRequestBody = {
  input?: string;
  commitLanguage?: CommitLanguage;
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
    const commitLanguage = isCommitLanguage(body.commitLanguage)
      ? body.commitLanguage
      : DEFAULT_COMMIT_LANGUAGE;

    if (!input) {
      return NextResponse.json(
        { error: "입력 내용을 작성해주세요." },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey });

    const content = await createJsonObjectCompletion(
      openai,
      buildGenerateSystemPrompt({ commitLanguage }),
      buildUserInput(input, commitLanguage),
    );

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
      !isValidJournalEntry(result.journal) ||
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
