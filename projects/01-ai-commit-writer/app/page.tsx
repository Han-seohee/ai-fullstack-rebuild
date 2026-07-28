"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getMockResult, type GenerateResult } from "@/lib/mock";

const JOURNAL_SECTIONS = [
  { key: "context" as const, label: "📌 Context" },
  { key: "decision" as const, label: "⚖️ Decision" },
  { key: "outcome" as const, label: "✅ Outcome" },
  { key: "next" as const, label: "➡️ Next" },
];

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  function handleGenerate() {
    setIsGenerating(true);

    // Brief delay so the button state feels responsive before mock renders.
    window.setTimeout(() => {
      setResult(getMockResult(input));
      setIsGenerating(false);
    }, 400);
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
          disabled={isGenerating}
          className="h-10 px-5"
        >
          {isGenerating ? "생성 중…" : "✨ 생성하기"}
        </Button>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>커밋 메시지</CardTitle>
            <CardAction>
              <Button variant="outline" size="sm" disabled={!result}>
                복사
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
              <Button variant="outline" size="sm" disabled={!result}>
                복사
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
