"use client";

import { useRef, useState, type MutableRefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { GenerateResult, JournalEntry } from "@/lib/generate";

const JOURNAL_SECTIONS = [
  { key: "context" as const, label: "📌 Context" },
  { key: "decision" as const, label: "⚖️ Decision" },
  { key: "outcome" as const, label: "✅ Outcome" },
  { key: "next" as const, label: "➡️ Next" },
];

const COPY_FEEDBACK_MS = 2000;

/** 개발일지를 Markdown 한 덩어리로 묶어 노트·PR 본문 등에 바로 붙여넣을 수 있게 합니다. */
function formatJournalMarkdown(journal: JournalEntry): string {
  return JOURNAL_SECTIONS.map(
    ({ key, label }) => `## ${label}\n\n${journal[key]}`,
  ).join("\n\n");
}

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitCopied, setCommitCopied] = useState(false);
  const [journalCopied, setJournalCopied] = useState(false);

  const commitCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journalCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 공백만 있는 입력은 API 호출을 막아 불필요한 요청과 빈 결과를 방지합니다.
  const canGenerate = input.trim().length > 0;

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      // 클라이언트는 /api/generate만 호출합니다. 실제 AI 로직은 서버 Route Handler에 둡니다.
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });

      if (!response.ok) {
        throw new Error("생성 요청에 실패했습니다.");
      }

      const data: GenerateResult = await response.json();
      setResult(data);
    } catch (err) {
      // 실패 시 이전 결과를 지워 잘못된 내용을 복사하는 일을 막습니다.
      setResult(null);
      setError(
        err instanceof Error ? err.message : "생성 요청에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  /** 복사 성공 피드백은 2초 후 자동으로 되돌려 추가 클릭을 유도하지 않습니다. */
  function showCopyFeedback(
    setCopied: (value: boolean) => void,
    timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  ) {
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  async function handleCopyCommit() {
    if (!result) return;

    await navigator.clipboard.writeText(result.commitMessage);
    showCopyFeedback(setCommitCopied, commitCopyTimer);
  }

  async function handleCopyJournal() {
    if (!result) return;

    await navigator.clipboard.writeText(formatJournalMarkdown(result.journal));
    showCopyFeedback(setJournalCopied, journalCopyTimer);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          01 · AI Dev Assistant
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          AI Dev Assistant
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          오늘 작업한 내용을 입력하면 AI가 커밋 메시지와 개발일지를 생성합니다.
        </p>
      </header>

      <section className="space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`오늘 작업한 내용을 자유롭게 적어주세요.

예시)

- 로그인 API 구현
- JWT 인증 추가
- API 리팩토링
- README 수정`}
          rows={6}
          className="min-h-36 resize-y bg-card text-sm leading-relaxed"
        />
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={isLoading || !canGenerate}
          className="h-10 px-5"
        >
          {isLoading ? "생성 중..." : "✨ 생성하기"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>커밋 메시지</CardTitle>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                disabled={!result}
                onClick={handleCopyCommit}
              >
                {commitCopied ? "복사 완료 ✓" : "복사"}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className={result ? undefined : "min-h-16"}>
            {result ? (
              <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 px-4 py-3 font-mono text-sm leading-relaxed text-foreground">
                {result.commitMessage}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                아직 생성되지 않았습니다.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>개발일지</CardTitle>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                disabled={!result}
                onClick={handleCopyJournal}
              >
                {journalCopied ? "복사 완료 ✓" : "복사"}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent
            className={result ? "space-y-5" : "min-h-28 space-y-3"}
          >
            {JOURNAL_SECTIONS.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {label}
                </h3>
                {result && (
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {result.journal[key]}
                  </p>
                )}
              </div>
            ))}
            {!result && (
              <p className="text-sm text-muted-foreground">
                아직 생성되지 않았습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
