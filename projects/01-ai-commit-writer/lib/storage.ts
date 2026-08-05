import type {
  CommitLanguage,
  FollowUpQuestion,
  GenerateResult,
} from "@/lib/generate";
import {
  DEFAULT_COMMIT_LANGUAGE,
  getCommitMessage,
  normalizeGenerateResult,
} from "@/lib/generate";

const DRAFT_KEY = "ai-dev-assistant-draft";
const HISTORY_KEY = "ai-dev-assistant-history";
const MAX_HISTORY = 5;

export type TroubleshootingChoice = "none" | "error" | "custom";

export type DraftState = {
  work: string;
  questions: FollowUpQuestion[];
  checkedOptions: Record<string, string[]>;
  customAnswers: Record<string, string>;
  troubleshootingChoice: TroubleshootingChoice | null;
  troubleshootingText: string;
  /** 0=작업 입력, 1..N=AI 질문, 마지막=트러블슈팅 */
  currentStep: number;
  analyzed: boolean;
  commitLanguage: CommitLanguage;
};

export type HistoryEntry = {
  id: string;
  commitMessage: string;
  result: GenerateResult;
  combinedInput: string;
  createdAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** localStorage에서 입력 초안을 읽습니다. */
export function loadDraft(): DraftState | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const draft = parsed as DraftState & { answers?: Record<string, string> };
    if (
      typeof draft.work !== "string" ||
      typeof draft.currentStep !== "number" ||
      typeof draft.analyzed !== "boolean" ||
      !Array.isArray(draft.questions)
    ) {
      return null;
    }

    // v2 draft 호환
    const checkedOptions =
      draft.checkedOptions ??
      (draft.answers
        ? Object.fromEntries(
            draft.questions.map((q) => {
              const answer = draft.answers?.[q.id];
              if (!answer) return [q.id, []];
              const parts = answer.split(", ").filter(Boolean);
              const preset = parts.filter((p) => q.options.includes(p));
              const custom = parts.find((p) => !q.options.includes(p));
              const checked = [...preset];
              if (custom) checked.push("__custom__");
              return [q.id, checked];
            }),
          )
        : {});

    return {
      work: draft.work,
      questions: draft.questions,
      checkedOptions,
      customAnswers: draft.customAnswers ?? {},
      troubleshootingChoice: draft.troubleshootingChoice ?? null,
      troubleshootingText: draft.troubleshootingText ?? "",
      currentStep: draft.currentStep,
      analyzed: draft.analyzed,
      commitLanguage: draft.commitLanguage ?? DEFAULT_COMMIT_LANGUAGE,
    };
  } catch {
    return null;
  }
}

/** 입력 초안을 localStorage에 저장합니다. */
export function saveDraft(draft: DraftState): void {
  if (!isBrowser()) return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

/** 생성 완료 후 입력 초안을 비웁니다. */
export function clearDraft(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(DRAFT_KEY);
}

/** localStorage에서 생성 기록을 읽습니다. */
export function loadHistory(): HistoryEntry[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const entries: HistoryEntry[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "object" || entry === null) continue;
      const e = entry as HistoryEntry;
      const result = normalizeGenerateResult(e.result);
      if (
        typeof e.id === "string" &&
        typeof e.createdAt === "string" &&
        result
      ) {
        entries.push({
          ...e,
          result,
          commitMessage:
            typeof e.commitMessage === "string"
              ? e.commitMessage
              : getCommitMessage(result, DEFAULT_COMMIT_LANGUAGE),
        });
      }
    }
    return entries;
  } catch {
    return [];
  }
}

/** 생성 결과를 기록 맨 앞에 추가하고 최대 5개만 유지합니다. */
export function addHistoryEntry(
  result: GenerateResult,
  combinedInput: string,
): HistoryEntry[] {
  if (!isBrowser()) return [];

  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    commitMessage: getCommitMessage(result, DEFAULT_COMMIT_LANGUAGE),
    result,
    combinedInput,
    createdAt: new Date().toISOString(),
  };

  const next = [entry, ...loadHistory()].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}
