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
