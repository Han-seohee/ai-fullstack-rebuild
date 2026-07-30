export type JournalEntry = {
  context: string;
  decision: string;
  outcome: string;
  next: string;
};

export type GenerateResult = {
  commitMessage: string;
  journal: JournalEntry;
};
