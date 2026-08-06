import { NextResponse } from "next/server";
import OpenAI from "openai";

import type { AnalyzeResult, FollowUpQuestion } from "@/lib/generate";
import { createJsonObjectCompletion } from "@/lib/openai-json";
import { ANALYZE_SYSTEM_PROMPT } from "@/lib/prompts/analyze";
import { buildAnalyzeUserInput } from "@/lib/prompt";

type AnalyzeRequestBody = {
  work?: string;
};

const VALID_CATEGORIES = new Set(["reason", "troubleshooting", "next"]);

function isValidQuestion(value: unknown): value is FollowUpQuestion {
  if (typeof value !== "object" || value === null) return false;
  const q = value as FollowUpQuestion;
  return (
    typeof q.id === "string" &&
    VALID_CATEGORIES.has(q.category) &&
    typeof q.question === "string" &&
    Array.isArray(q.options) &&
    q.options.length >= 2 &&
    q.options.every((o) => typeof o === "string")
  );
}

/**
 * POST /api/analyze
 *
 * 작업 내용을 분석해 개발일지 작성에 필요한 follow-up 질문을 반환합니다.
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
    const body = (await request.json()) as AnalyzeRequestBody;
    const work = (body.work ?? "").trim();

    if (!work) {
      return NextResponse.json(
        { error: "작업 내용을 작성해주세요." },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey });

    const content = await createJsonObjectCompletion(
      openai,
      ANALYZE_SYSTEM_PROMPT,
      buildAnalyzeUserInput(work),
    );

    const parsed = JSON.parse(content) as AnalyzeResult;

    if (
      !Array.isArray(parsed.questions) ||
      !parsed.questions.every(isValidQuestion)
    ) {
      throw new Error("OpenAI 응답 형식이 올바르지 않습니다.");
    }

    // 최대 3개 질문으로 제한
    const result: AnalyzeResult = {
      questions: parsed.questions.slice(0, 3),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/analyze]", error);
    return NextResponse.json(
      { error: "작업 분석에 실패했습니다." },
      { status: 500 },
    );
  }
}
