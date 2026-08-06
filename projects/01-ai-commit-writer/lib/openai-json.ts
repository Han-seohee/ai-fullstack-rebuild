import OpenAI from "openai";

const JSON_OBJECT_TEXT_FORMAT = {
  text: { format: { type: "json_object" as const } },
};

/**
 * Responses API json_object 모드 호출을 API route에서 공통 사용합니다.
 * input 메시지에 'json' 키워드가 포함되어야 하므로 buildUserInput / buildDetailUserInput에서 보장합니다.
 */
export async function createJsonObjectCompletion(
  openai: OpenAI,
  instructions: string,
  input: string,
): Promise<string> {
  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    instructions,
    input,
    ...JSON_OBJECT_TEXT_FORMAT,
  });

  const content = response.output_text;
  if (!content) {
    throw new Error("OpenAI 응답이 비어 있습니다.");
  }

  return content;
}
