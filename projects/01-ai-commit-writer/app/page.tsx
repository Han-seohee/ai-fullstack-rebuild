"use client";

import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const WIZARD_STEPS = [
  {
    inputKey: "work" as const,
    label: "오늘 무엇을 작업했나요?",
    required: true,
    placeholder: "OpenAI API 연동\nPrompt 분리\n로그인 API 구현",
    examples: ["Route Handler 추가", "Prompt 분리", "UI 개선"],
  },
  {
    inputKey: "reason" as const,
    label: "왜 그 작업을 했나요?",
    required: false,
    placeholder: "Mock API를 실제 API로 교체하기 위해",
    examples: [
      "Mock 대신 실제 API를 연결하기 위해",
      "유지보수를 쉽게 하기 위해",
      "코드 중복을 줄이기 위해",
    ],
  },
  {
    inputKey: "troubleshooting" as const,
    label: "작업 중 문제나 에러가 있었나요?",
    required: false,
    placeholder:
      "POST /api/generate 500\nResponse input messages must contain the word 'json'",
    examples: [
      "500 에러 발생",
      "JSON 응답 오류",
      "타입 오류",
      "없으면 비워도 됩니다.",
    ],
  },
  {
    inputKey: "nextPlan" as const,
    label: "다음에는 무엇을 할 예정인가요?",
    required: false,
    placeholder: "에러 핸들링 추가\nPrompt 개선",
    examples: ["OpenAI 응답 개선", "복사 기능 추가", "배포"],
  },
] as const;

const LAST_STEP = WIZARD_STEPS.length - 1;
const COPY_FEEDBACK_MS = 2000;

const TEXTAREA_CLASS =
  "field-sizing-fixed min-h-24 resize-none bg-background/50 text-sm leading-relaxed transition-colors focus-visible:bg-background";

type WorkInput = {
  work: string;
  reason: string;
  troubleshooting: string;
  nextPlan: string;
};

type StepDirection = "forward" | "back";

/** 입력을 하나의 문자열로 조합해 기존 API 계약을 유지합니다. */
function buildCombinedInput(input: WorkInput): string {
  const sections = [`[오늘 작업]\n${input.work.trim()}`];

  if (input.reason.trim()) {
    sections.push(`[작업 목적]\n${input.reason.trim()}`);
  }
  if (input.troubleshooting.trim()) {
    sections.push(`[트러블슈팅]\n${input.troubleshooting.trim()}`);
  }
  if (input.nextPlan.trim()) {
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

export default function Home() {
  const [input, setInput] = useState<WorkInput>(INITIAL_INPUT);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDirection, setStepDirection] = useState<StepDirection>("forward");
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [lastCombinedInput, setLastCombinedInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [commitCopied, setCommitCopied] = useState(false);
  const [journalCopied, setJournalCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commitCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journalCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = WIZARD_STEPS[currentStep];
  const isLastStep = currentStep === LAST_STEP;
  const canProceed =
    !step.required || input[step.inputKey].trim().length > 0;
  const canGenerate = input.work.trim().length > 0;

  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentStep]);

  function goToStep(nextStep: number, direction: StepDirection) {
    setStepDirection(direction);
    setCurrentStep(nextStep);
    setError(null);
  }

  function handleNext() {
    if (!canProceed || isLastStep) return;
    goToStep(currentStep + 1, "forward");
  }

  function handleBack() {
    if (currentStep === 0) return;
    goToStep(currentStep - 1, "back");
  }

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);
    setDetailError(null);

    const combinedInput = buildCombinedInput(input);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: combinedInput }),
      });

      if (!response.ok) {
        throw new Error("생성 요청에 실패했습니다.");
      }

      const data: GenerateResult = await response.json();
      setLastCombinedInput(combinedInput);
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

  async function handleDetailGenerate() {
    if (!result || !lastCombinedInput) return;

    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const response = await fetch("/api/generate/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: lastCombinedInput,
          journal: result.journal,
        }),
      });

      if (!response.ok) {
        throw new Error("상세 생성 요청에 실패했습니다.");
      }

      const data: { journal: JournalEntry } = await response.json();
      setResult((prev) =>
        prev
          ? {
              ...prev,
              journal: {
                ...data.journal,
                next: prev.journal.next,
              },
            }
          : prev,
      );
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : "상세 생성 요청에 실패했습니다.",
      );
    } finally {
      setIsDetailLoading(false);
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
            질문에 하나씩 답해주세요. 필수 항목만 작성해도 충분합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div
            className="flex items-center gap-2"
            aria-label={`${currentStep + 1} / ${WIZARD_STEPS.length} 단계`}
          >
            {WIZARD_STEPS.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  index <= currentStep ? "bg-primary" : "bg-muted",
                  index === currentStep && "scale-y-125",
                )}
              />
            ))}
          </div>

          <div
            key={currentStep}
            className={cn(
              "space-y-4",
              stepDirection === "forward"
                ? "animate-in fade-in slide-in-from-right-3 duration-300"
                : "animate-in fade-in slide-in-from-left-3 duration-300",
            )}
          >
            <div className="space-y-1.5">
              <label
                htmlFor={`${step.inputKey}-input`}
                className="block text-sm font-medium text-foreground"
              >
                {step.label}
                {!step.required && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (선택)
                  </span>
                )}
              </label>
              {"examples" in step && step.examples.length > 0 && (
                <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
                  <p>예)</p>
                  <ul className="list-inside list-disc space-y-0.5 pl-0.5">
                    {step.examples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Textarea
              ref={textareaRef}
              id={`${step.inputKey}-input`}
              value={input[step.inputKey]}
              onChange={(e) =>
                setInput((prev) => ({
                  ...prev,
                  [step.inputKey]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (isLastStep && canGenerate && !isLoading) {
                    void handleGenerate();
                  } else if (!isLastStep && canProceed) {
                    handleNext();
                  }
                }
              }}
              placeholder={step.placeholder}
              rows={step.inputKey === "work" ? 4 : 3}
              className={cn(
                TEXTAREA_CLASS,
                step.inputKey === "work" && "min-h-28",
              )}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-border/50 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {isLastStep
                ? canGenerate
                  ? "입력 내용을 바탕으로 AI가 추천 결과를 생성합니다."
                  : "작업 내용을 입력하면 생성할 수 있습니다."
                : step.required
                  ? "작업 내용을 입력한 뒤 다음으로 넘어가세요."
                  : "건너뛰려면 비워두고 다음을 누르세요."}
            </p>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="h-10 px-4 transition-opacity duration-200"
                >
                  <ChevronLeft className="size-4" />
                  이전
                </Button>
              )}
              {isLastStep ? (
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isLoading || !canGenerate}
                  className="h-10 px-6 transition-opacity duration-200"
                >
                  {isLoading ? "생성 중..." : "✨ AI 추천 생성하기"}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="h-10 px-6 transition-opacity duration-200"
                >
                  다음
                </Button>
              )}
            </div>
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
                  AI 추천 생성하기를 누르면 추천 커밋 메시지가 표시됩니다.
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
                  AI 추천 생성하기를 누르면 추천 개발일지가 표시됩니다.
                </p>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDetailGenerate}
                  disabled={isDetailLoading || isLoading}
                  className="h-10 w-full transition-opacity duration-200 sm:w-auto"
                >
                  {isDetailLoading
                    ? "보강 중..."
                    : "✨ 더 자세하게 작성하기"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Context · Decision · Outcome을 입력한 사실만 연결해 더 읽기 쉽게 정리합니다.
                  새로운 내용은 추가하지 않습니다. Next는 그대로 유지됩니다.
                </p>
                {detailError && (
                  <p className="text-sm text-destructive">{detailError}</p>
                )}
              </div>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
