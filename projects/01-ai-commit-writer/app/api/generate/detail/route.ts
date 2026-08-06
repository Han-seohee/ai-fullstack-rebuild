import { NextResponse } from "next/server";
import OpenAI from "openai";

import { type DetailResult, isValidJournalEntry } from "@/lib/generate";
import { createJsonObjectCompletion } from "@/lib/openai-json";
import { DETAIL_SYSTEM_PROMPT, buildDetailUserInput } from "@/lib/prompt";

type DetailRequestBody = {
  input?: string;
  journal?: unknown;
};

/**
 * POST /api/generate/detail
 *
 * 기존 생성 결과의 context·decision·outcome을 입력 근거만 연결해 더 읽기 쉽게 다시 작성합니다.
 * next 필드는 요청으로 받은 journal.next 값을 그대로 유지합니다.
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
    const body = (await request.json()) as DetailRequestBody;
    const input = (body.input ?? "").trim();

    if (!input) {
      return NextResponse.json(
        { error: "입력 내용을 작성해주세요." },
        { status: 400 },
      );
    }

    if (!isValidJournalEntry(body.journal)) {
      return NextResponse.json(
        { error: "개발일지 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const originalNext = body.journal.next;
    const openai = new OpenAI({ apiKey });

    const content = await createJsonObjectCompletion(
      openai,
      DETAIL_SYSTEM_PROMPT,
      buildDetailUserInput(input, body.journal),
    );

    const parsed = JSON.parse(content) as DetailResult;

    if (!isValidJournalEntry(parsed.journal)) {
      throw new Error("OpenAI 응답 형식이 올바르지 않습니다.");
    }

    const result: DetailResult = {
      journal: {
        ...parsed.journal,
        next: originalNext,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/generate/detail]", error);
    return NextResponse.json(
      { error: "상세 생성 요청에 실패했습니다." },
      { status: 500 },
    );
  }
}
