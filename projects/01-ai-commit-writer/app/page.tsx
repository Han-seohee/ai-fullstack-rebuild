"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRef, useState, type MutableRefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import type {
  GenerateResult,
  JournalEntry,
  TroubleshootingEntry,
} from "@/lib/generate";
import { cn } from "@/lib/utils";

const JOURNAL_SECTIONS = [
  { key: "context" as const, label: "📌 Context" },
  { key: "decision" as const, label: "⚖️ Decision" },
  { key: "outcome" as const, label: "✅ Outcome" },
  { key: "next" as const, label: "➡️ Next" },
];

const TROUBLESHOOTING_SECTIONS = [
  { key: "problem" as const, label: "문제" },
  { key: "cause" as const, label: "원인" },
  { key: "solution" as const, label: "해결" },
  { key: "learned" as const, label: "배운 점" },
];

const COPY_FEEDBACK_MS = 2000;

const TEXTAREA_CLASS =
  "field-sizing-fixed min-h-24 resize-none bg-background/50 text-sm leading-relaxed transition-colors focus-visible:bg-background";

type WorkInput = {
  work: string;
  reason: string;
  troubleshooting: string;
  nextPlan: string;
};

type EnabledSections = {
  showReason: boolean;
  showTroubleshooting: boolean;
  showNextPlan: boolean;
};

type OpenSections = EnabledSections;

const OPTIONAL_SECTIONS = [
  {
    enableKey: "showReason" as const,
    inputKey: "reason" as const,
    triggerLabel: "작업 목적",
    label: "이번 작업의 목적은 무엇이었나요?",
    placeholder: "Mock API를 실제 API로 교체하기 위해",
  },
  {
    enableKey: "showTroubleshooting" as const,
    inputKey: "troubleshooting" as const,
    triggerLabel: "트러블슈팅",
    label: "문제가 있었나요?",
    hint: "에러 메시지만 붙여넣어도 AI가 정리합니다.",
    placeholder:
      "POST /api/generate 500\nResponse input messages must contain the word 'json'",
  },
  {
    enableKey: "showNextPlan" as const,
    inputKey: "nextPlan" as const,
    triggerLabel: "다음 계획",
    label: "다음에는 무엇을 할 예정인가요?",
    placeholder: "에러 핸들링 추가\nPrompt 개선",
  },
];

/** 입력을 하나의 문자열로 조합해 기존 API 계약을 유지합니다. */
function buildCombinedInput(
  input: WorkInput,
  enabled: EnabledSections,
): string {
  const sections = [`[오늘 작업]\n${input.work.trim()}`];

  if (enabled.showReason && input.reason.trim()) {
    sections.push(`[작업 목적]\n${input.reason.trim()}`);
  }
  if (enabled.showTroubleshooting && input.troubleshooting.trim()) {
    sections.push(`[트러블슈팅]\n${input.troubleshooting.trim()}`);
  }
  if (enabled.showNextPlan && input.nextPlan.trim()) {
    sections.push(`[다음 계획]\n${input.nextPlan.trim()}`);
  }

  return sections.join("\n\n");
}

/** 개발일지를 Markdown 한 덩어리로 묶어 노트·PR 본문 등에 바로 붙여넣을 수 있게 합니다. */
function formatJournalMarkdown(
  journal: JournalEntry,
  troubleshooting: TroubleshootingEntry | null,
): string {
  const journalMarkdown = JOURNAL_SECTIONS.map(
    ({ key, label }) => `## ${label}\n\n${journal[key]}`,
  ).join("\n\n");

  if (!troubleshooting) return journalMarkdown;

  const troubleshootingMarkdown = TROUBLESHOOTING_SECTIONS.map(
    ({ key, label }) => `### ${label}\n\n${troubleshooting[key]}`,
  ).join("\n\n");

  return `${journalMarkdown}\n\n## 🚨 Troubleshooting\n\n${troubleshootingMarkdown}`;
}

const INITIAL_INPUT: WorkInput = {
  work: "",
  reason: "",
  troubleshooting: "",
  nextPlan: "",
};

const INITIAL_SECTIONS: EnabledSections = {
  showReason: false,
  showTroubleshooting: false,
  showNextPlan: false,
};

export default function Home() {
  const [input, setInput] = useState<WorkInput>(INITIAL_INPUT);
  const [enabled, setEnabled] = useState<EnabledSections>(INITIAL_SECTIONS);
  const [openSections, setOpenSections] =
    useState<OpenSections>(INITIAL_SECTIONS);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitCopied, setCommitCopied] = useState(false);
  const [journalCopied, setJournalCopied] = useState(false);

  const commitCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journalCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canGenerate = input.work.trim().length > 0;

  function handleSectionOpenChange(
    enableKey: keyof EnabledSections,
    inputKey: keyof WorkInput,
    open: boolean,
  ) {
    setOpenSections((prev) => ({ ...prev, [enableKey]: open }));

    if (open) {
      setEnabled((prev) => ({ ...prev, [enableKey]: true }));
      return;
    }

    if (!input[inputKey].trim()) {
      setEnabled((prev) => ({ ...prev, [enableKey]: false }));
    }
  }

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: buildCombinedInput(input, enabled) }),
      });

      if (!response.ok) {
        throw new Error("생성 요청에 실패했습니다.");
      }

      const data: GenerateResult = await response.json();
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof Error ? err.message : "생성 요청에 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

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

    await navigator.clipboard.writeText(
      formatJournalMarkdown(result.journal, result.troubleshooting),
    );
    showCopyFeedback(setJournalCopied, journalCopyTimer);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          01 · AI Dev Assistant
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          AI Dev Assistant
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          오늘 작업 내용만 입력해도 AI가 커밋 메시지와 개발일지를 추천합니다.
        </p>
      </header>

      <Card className="transition-shadow duration-200 hover:shadow-sm">
        <CardHeader className="border-b border-border/50">
          <CardTitle>오늘의 작업</CardTitle>
          <CardDescription>
            필수 항목만 작성해도 충분합니다. 필요할 때 선택 항목을 펼쳐
            추가하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div>
            <label
              htmlFor="work-input"
              className="mb-5 block text-sm font-medium text-foreground"
            >
              오늘 무엇을 작업했나요?
            </label>
            <Textarea
              id="work-input"
              value={input.work}
              onChange={(e) =>
                setInput((prev) => ({ ...prev, work: e.target.value }))
              }
              placeholder={
                "OpenAI API 연동\nPrompt 분리\n로그인 API 구현"
              }
              rows={4}
              className={cn(TEXTAREA_CLASS, "min-h-28")}
            />
          </div>

          <div className="space-y-3">
            {OPTIONAL_SECTIONS.map(
              ({
                enableKey,
                inputKey,
                triggerLabel,
                label,
                hint,
                placeholder,
              }) => (
                <Collapsible
                  key={enableKey}
                  open={openSections[enableKey]}
                  onOpenChange={(open) =>
                    handleSectionOpenChange(enableKey, inputKey, open)
                  }
                >
                  <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-muted/40 hover:text-foreground">
                    <Plus className="size-3.5 shrink-0 transition-transform duration-200 group-data-panel-open:rotate-45" />
                    <span>
                      {triggerLabel}
                      <span className="ml-1.5 text-xs text-muted-foreground/70">
                        (선택)
                      </span>
                    </span>
                    <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-panel-open:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-1 pt-4 pb-1">
                      <div className="mb-4 space-y-1.5">
                        <label
                          htmlFor={`${inputKey}-input`}
                          className="block text-sm font-medium text-foreground"
                        >
                          {label}
                        </label>
                        {hint && (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {hint}
                          </p>
                        )}
                      </div>
                      <Textarea
                        id={`${inputKey}-input`}
                        value={input[inputKey]}
                        onChange={(e) =>
                          setInput((prev) => ({
                            ...prev,
                            [inputKey]: e.target.value,
                          }))
                        }
                        placeholder={placeholder}
                        rows={3}
                        className={TEXTAREA_CLASS}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ),
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border/50 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {canGenerate
                ? "입력 내용을 바탕으로 AI가 추천 결과를 생성합니다."
                : "작업 내용을 입력하면 생성할 수 있습니다."}
            </p>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isLoading || !canGenerate}
              className="h-10 shrink-0 px-6 transition-opacity duration-200"
            >
              {isLoading ? "생성 중..." : "✨ 생성하기"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card
        className={cn(
          "transition-all duration-300",
          result && "ring-1 ring-primary/20",
        )}
      >
        <CardHeader className="border-b border-border/50">
          <CardTitle>추천 결과</CardTitle>
          <CardDescription>
            AI가 입력 내용을 바탕으로 추천한 커밋 메시지와 개발일지입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  추천 커밋 메시지
                </h3>
                <p className="text-xs text-muted-foreground">
                  그대로 복사해 커밋에 사용하세요.
                </p>
              </div>
              <CardAction>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!result}
                  onClick={handleCopyCommit}
                  className="transition-colors duration-200"
                >
                  {commitCopied ? "복사 완료 ✓" : "복사"}
                </Button>
              </CardAction>
            </div>
            {result ? (
              <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/30 px-4 py-3 font-mono text-sm leading-relaxed text-foreground transition-colors duration-200">
                {result.commitMessage}
              </pre>
            ) : (
              <div className="flex min-h-16 items-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-4">
                <p className="text-sm text-muted-foreground">
                  생성하기를 누르면 추천 커밋 메시지가 표시됩니다.
                </p>
              </div>
            )}
          </section>

          <div className="border-t border-border/50" />

          <section className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  추천 개발일지
                </h3>
                <p className="text-xs text-muted-foreground">
                  Markdown 형식으로 복사할 수 있습니다.
                </p>
              </div>
              <CardAction>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!result}
                  onClick={handleCopyJournal}
                  className="transition-colors duration-200"
                >
                  {journalCopied ? "복사 완료 ✓" : "복사"}
                </Button>
              </CardAction>
            </div>

            {result ? (
              <div className="space-y-5 rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors duration-200">
                {JOURNAL_SECTIONS.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {label}
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {result.journal[key]}
                    </p>
                  </div>
                ))}
                {result.troubleshooting ? (
                  <div className="space-y-4 border-t border-border/60 pt-4">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      🚨 Troubleshooting
                    </h4>
                    {TROUBLESHOOTING_SECTIONS.map(({ key, label }) => {
                      const troubleshooting = result.troubleshooting!;
                      return (
                        <div key={key} className="space-y-1.5">
                          <h5 className="text-sm font-medium text-muted-foreground/80">
                            {label}
                          </h5>
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {troubleshooting[key]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-28 items-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-4">
                <p className="text-sm text-muted-foreground">
                  생성하기를 누르면 추천 개발일지가 표시됩니다.
                </p>
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
