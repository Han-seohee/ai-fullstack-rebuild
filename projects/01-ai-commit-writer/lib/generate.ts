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

export type CommitMessages = {
  ko: string;
  en: string;
};

export type GenerateResult = {
  commit: CommitMessages;
  journal: JournalEntry;
  troubleshooting: TroubleshootingEntry | null;
};

/** 커밋 메시지 UI 표시 언어 (토글용, API 재호출 없음) */
export const COMMIT_LANGUAGES = ["ko", "en"] as const;
export type CommitLanguage = (typeof COMMIT_LANGUAGES)[number];
export const DEFAULT_COMMIT_LANGUAGE: CommitLanguage = "en";

export const COMMIT_LANGUAGE_LABELS: Record<CommitLanguage, string> = {
  ko: "🇰🇷 한국어",
  en: "🇺🇸 English",
};

export function isCommitLanguage(value: unknown): value is CommitLanguage {
  return (
    typeof value === "string" &&
    (COMMIT_LANGUAGES as readonly string[]).includes(value)
  );
}

export function getCommitMessage(
  result: GenerateResult,
  lang: CommitLanguage = DEFAULT_COMMIT_LANGUAGE,
): string {
  return result.commit[lang];
}

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

export function isValidCommitMessages(value: unknown): value is CommitMessages {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CommitMessages).ko === "string" &&
    typeof (value as CommitMessages).en === "string"
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

  const troubleshooting = raw.troubleshooting;
  const isValidTroubleshooting =
    troubleshooting === null ||
    (typeof troubleshooting === "object" &&
      troubleshooting !== null &&
      typeof (troubleshooting as TroubleshootingEntry).problem === "string");

  if (!isValidTroubleshooting) return null;

  const journal = isValidJournalEntry(raw.journal)
    ? raw.journal
    : (() => {
        const journals = raw.journals as LegacyStyledJournals | undefined;
        return journals && isValidJournalEntry(journals.default)
          ? journals.default
          : null;
      })();

  if (!journal) return null;

  if (isValidCommitMessages(raw.commit)) {
    return {
      commit: raw.commit,
      journal,
      troubleshooting: troubleshooting as TroubleshootingEntry | null,
    };
  }

  // v6 이전: commitMessage 단일 문자열
  if (typeof raw.commitMessage === "string") {
    const message = raw.commitMessage;
    return {
      commit: { ko: message, en: message },
      journal,
      troubleshooting: troubleshooting as TroubleshootingEntry | null,
    };
  }

  return null;
}
