export type JournalEntry = {
  context: string;
  decision: string;
  outcome: string;
  next: string;
};

export type TroubleshootingEntry = {
  problem: string;
  cause: string;
  solution: string;
  learned: string;
};

export type GenerateResult = {
  commitMessage: string;
  journal: JournalEntry;
  troubleshooting: TroubleshootingEntry | null;
};

/** AI follow-up 질문 카테고리 */
export type QuestionCategory = "reason" | "troubleshooting" | "next";

export type FollowUpQuestion = {
  id: string;
  category: QuestionCategory;
  question: string;
  options: string[];
};

export type AnalyzeResult = {
  questions: FollowUpQuestion[];
};

export function isValidJournalEntry(value: unknown): value is JournalEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as JournalEntry).context === "string" &&
    typeof (value as JournalEntry).decision === "string" &&
    typeof (value as JournalEntry).outcome === "string" &&
    typeof (value as JournalEntry).next === "string"
  );
}

type LegacyStyledJournals = {
  default?: JournalEntry;
  interview?: JournalEntry;
  retrospective?: JournalEntry;
};

/** localStorage 등 레거시 결과를 새 형식으로 정규화합니다. */
export function normalizeGenerateResult(value: unknown): GenerateResult | null {
  if (typeof value !== "object" || value === null) return null;

  const raw = value as Record<string, unknown>;
  if (typeof raw.commitMessage !== "string") return null;

  const troubleshooting = raw.troubleshooting;
  const isValidTroubleshooting =
    troubleshooting === null ||
    (typeof troubleshooting === "object" &&
      troubleshooting !== null &&
      typeof (troubleshooting as TroubleshootingEntry).problem === "string");

  if (!isValidTroubleshooting) return null;

  if (isValidJournalEntry(raw.journal)) {
    return {
      commitMessage: raw.commitMessage,
      journal: raw.journal,
      troubleshooting: troubleshooting as TroubleshootingEntry | null,
    };
  }

  // v3 history 호환: journals.default → journal
  const journals = raw.journals as LegacyStyledJournals | undefined;
  if (journals && isValidJournalEntry(journals.default)) {
    return {
      commitMessage: raw.commitMessage,
      journal: journals.default,
      troubleshooting: troubleshooting as TroubleshootingEntry | null,
    };
  }

  return null;
}
