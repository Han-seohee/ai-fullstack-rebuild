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

export type DetailResult = {
  journal: JournalEntry;
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
