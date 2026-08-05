import {
  COMMIT_BILINGUAL_RULE,
  COMMIT_FEW_SHOT,
  COMMIT_PROMPT,
} from "@/lib/prompts/commit";
import { DETAIL_FEW_SHOT, DETAIL_PROMPT } from "@/lib/prompts/detail";
import {
  JOURNAL_FORBIDDEN_PHRASES,
  JOURNAL_PROMPT,
} from "@/lib/prompts/journal";
import {
  CORE_PRINCIPLES,
  FACT_RESTRICTION_RULES,
  FEW_SHOT_HEADER,
  GENERATE_ROLE,
  JSON_OUTPUT_RULES,
  OUTPUT_FORMAT,
  joinPromptSections,
} from "@/lib/prompts/shared";

/** generate API용 system prompt — shared + commit + journal + detail 조합 */
export function buildGenerateSystemPrompt(): string {
  return joinPromptSections(
    GENERATE_ROLE,
    FACT_RESTRICTION_RULES,
    JOURNAL_FORBIDDEN_PHRASES,
    CORE_PRINCIPLES,
    COMMIT_PROMPT,
    COMMIT_BILINGUAL_RULE,
    JOURNAL_PROMPT,
    DETAIL_PROMPT,
    OUTPUT_FORMAT,
    FEW_SHOT_HEADER,
    COMMIT_FEW_SHOT,
    DETAIL_FEW_SHOT,
    JSON_OUTPUT_RULES,
  );
}
