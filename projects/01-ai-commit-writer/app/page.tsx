"use client";

import { ChevronLeft, Clock } from "lucide-react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
  CommitLanguage,
  FollowUpQuestion,
  GenerateResult,
  JournalEntry,
  TroubleshootingEntry,
} from "@/lib/generate";
import {
  COMMIT_LANGUAGES,
  COMMIT_LANGUAGE_LABELS,
  DEFAULT_COMMIT_LANGUAGE,
  getCommitMessage,
} from "@/lib/generate";
import { buildCombinedInput } from "@/lib/input";
import {
  addHistoryEntry,
  clearDraft,
  loadDraft,
  loadHistory,
  saveDraft,
  type HistoryEntry,
  type TroubleshootingChoice,
} from "@/lib/storage";
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
const CUSTOM_OPTION = "__custom__";

const TROUBLESHOOTING_OPTIONS: {
  value: TroubleshootingChoice;
  label: string;
}[] = [
  { value: "none", label: "없었어요" },
  { value: "error", label: "에러가 있었어요" },
  { value: "custom", label: "직접 입력" },
];

const TEXTAREA_CLASS =
  "field-sizing-fixed min-h-24 resize-none bg-background/50 text-sm leading-relaxed transition-colors focus-visible:bg-background";

type StepDirection = "forward" | "back";

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

/** 기록 목록에 표시할 생성 시각을 포맷합니다. */
function formatHistoryTime(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** 현재 단계 라벨 */
function getStepLabel(
  currentStep: number,
  questionCount: number,
): string {
  if (currentStep === 0) return "작업 입력";
  if (currentStep <= questionCount) return "맥락 질문";
  return "트러블슈팅";
}

export default function Home() {
  const [work, setWork] = useState("");
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [checkedOptions, setCheckedOptions] = useState<
    Record<string, string[]>
  >({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>(
    {},
  );
  const [troubleshootingChoice, setTroubleshootingChoice] =
    useState<TroubleshootingChoice | null>(null);
  const [troubleshootingText, setTroubleshootingText] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDirection, setStepDirection] = useState<StepDirection>("forward");
  const [analyzed, setAnalyzed] = useState(false);
  const [workAtAnalysis, setWorkAtAnalysis] = useState("");
  const [commitLanguage, setCommitLanguage] = useState<CommitLanguage>(
    DEFAULT_COMMIT_LANGUAGE,
  );

  const [result, setResult] = useState<GenerateResult | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitCopied, setCommitCopied] = useState(false);
  const [journalCopied, setJournalCopied] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const customInputRef = useRef<HTMLTextAreaElement>(null);
  const troubleshootingInputRef = useRef<HTMLTextAreaElement>(null);
  const commitCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const journalCopyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 0=작업, 1..N=AI질문, N+1=트러블슈팅(항상 마지막)
  const totalSteps = 1 + questions.length + 1;
  const isWorkStep = currentStep === 0;
  const isTroubleshootingStep = currentStep === totalSteps - 1;
  const questionIndex = currentStep - 1;
  const currentQuestion =
    !isWorkStep && !isTroubleshootingStep
      ? questions[questionIndex]
      : null;
  const isLastStep = isTroubleshootingStep;

  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentStep]);

  // 작업 내용 변경 시 분석 결과 초기화
  useEffect(() => {
    if (!isDraftLoaded) return;
    if (work.trim() !== workAtAnalysis && analyzed) {
      setAnalyzed(false);
      setQuestions([]);
      setCheckedOptions({});
      setCustomAnswers({});
      setTroubleshootingChoice(null);
      setTroubleshootingText("");
      setCurrentStep(0);
    }
  }, [work, workAtAnalysis, analyzed, isDraftLoaded]);

  // 새로고침 후 마지막 입력 복원
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setWork(draft.work);
      setQuestions(draft.questions);
      setCheckedOptions(draft.checkedOptions);
      setCustomAnswers(draft.customAnswers);
      setTroubleshootingChoice(draft.troubleshootingChoice);
      setTroubleshootingText(draft.troubleshootingText);
      setCurrentStep(draft.currentStep);
      setAnalyzed(draft.analyzed);
      setCommitLanguage(draft.commitLanguage ?? DEFAULT_COMMIT_LANGUAGE);
      if (draft.analyzed) setWorkAtAnalysis(draft.work.trim());
    }
    setHistory(loadHistory());
    setIsDraftLoaded(true);
  }, []);

  // 입력 변경 시 localStorage에 자동 저장
  useEffect(() => {
    if (!isDraftLoaded) return;
    saveDraft({
      work,
      questions,
      checkedOptions,
      customAnswers,
      troubleshootingChoice,
      troubleshootingText,
      currentStep,
      analyzed,
      commitLanguage,
    });
  }, [
    work,
    questions,
    checkedOptions,
    customAnswers,
    troubleshootingChoice,
    troubleshootingText,
    currentStep,
    analyzed,
    commitLanguage,
    isDraftLoaded,
  ]);

  function goToStep(nextStep: number, direction: StepDirection) {
    setStepDirection(direction);
    setCurrentStep(nextStep);
    setError(null);
  }

  /** AI 질문 답변: 선택된 선지 + 기타 입력을 하나의 문자열로 합칩니다. */
  function getQuestionAnswer(question: FollowUpQuestion): string {
    const checked = checkedOptions[question.id] ?? [];
    const parts = checked.filter((o) => o !== CUSTOM_OPTION);
    const custom = customAnswers[question.id]?.trim();
    if (checked.includes(CUSTOM_OPTION) && custom) {
      parts.push(custom);
    }
    return parts.join(", ");
  }

  function canProceedFromQuestion(question: FollowUpQuestion): boolean {
    const checked = checkedOptions[question.id] ?? [];
    if (checked.length === 0) return false;
    if (checked.includes(CUSTOM_OPTION)) {
      return (customAnswers[question.id]?.trim().length ?? 0) > 0;
    }
    return true;
  }

  function canProceedFromTroubleshooting(): boolean {
    if (!troubleshootingChoice) return false;
    if (troubleshootingChoice === "none") return true;
    return troubleshootingText.trim().length > 0;
  }

  const canProceed = isWorkStep
    ? work.trim().length > 0
    : isTroubleshootingStep
      ? canProceedFromTroubleshooting()
      : currentQuestion
        ? canProceedFromQuestion(currentQuestion)
        : false;

  async function handleAnalyze() {
    if (!work.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work: work.trim() }),
      });

      if (!response.ok) {
        throw new Error("작업 분석에 실패했습니다.");
      }

      const data: { questions: FollowUpQuestion[] } = await response.json();
      const trimmedWork = work.trim();
      setQuestions(data.questions);
      setCheckedOptions({});
      setCustomAnswers({});
      setTroubleshootingChoice(null);
      setTroubleshootingText("");
      setAnalyzed(true);
      setWork(trimmedWork);
      setWorkAtAnalysis(trimmedWork);

      // AI 질문이 있으면 첫 질문으로, 없으면 트러블슈팅 단계로
      goToStep(1, "forward");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "작업 분석에 실패했습니다.";
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    const resolvedAnswers: Record<string, string> = {};
    for (const q of questions) {
      const answer = getQuestionAnswer(q);
      if (answer) resolvedAnswers[q.id] = answer;
    }

    const troubleshootingForPrompt =
      troubleshootingChoice === "none"
        ? undefined
        : troubleshootingText.trim();

    const combinedInput = buildCombinedInput(
      work,
      questions,
      resolvedAnswers,
      troubleshootingForPrompt,
    );

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
      setResult(data);
      clearDraft();
      setHistory(addHistoryEntry(data, combinedInput));
      toast.success("AI 추천 결과가 생성되었습니다.");
    } catch (err) {
      setResult(null);
      const message =
        err instanceof Error ? err.message : "생성 요청에 실패했습니다.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewWork() {
    setWork("");
    setQuestions([]);
    setCheckedOptions({});
    setCustomAnswers({});
    setTroubleshootingChoice(null);
    setTroubleshootingText("");
    setCurrentStep(0);
    setAnalyzed(false);
    setWorkAtAnalysis("");
    setCommitLanguage(DEFAULT_COMMIT_LANGUAGE);
    setResult(null);
    setError(null);
    clearDraft();
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    await navigator.clipboard.writeText(getCommitMessage(result, commitLanguage));
    showCopyFeedback(setCommitCopied, commitCopyTimer);
    toast.success("커밋 메시지가 복사되었습니다.");
  }

  async function handleCopyJournal() {
    if (!result) return;

    await navigator.clipboard.writeText(
      formatJournalMarkdown(result.journal, result.troubleshooting),
    );
    showCopyFeedback(setJournalCopied, journalCopyTimer);
    toast.success("개발일지가 복사되었습니다.");
  }

  function handleHistorySelect(entry: HistoryEntry) {
    setResult(entry.result);
    setError(null);
  }

  function handlePrimaryAction() {
    if (isWorkStep && !analyzed) {
      void handleAnalyze();
      return;
    }
    if (isLastStep) {
      void handleGenerate();
      return;
    }
    if (canProceed) {
      goToStep(currentStep + 1, "forward");
    }
  }

  function handleBack() {
    if (currentStep === 0) return;
    goToStep(currentStep - 1, "back");
  }

  function toggleCheckbox(questionId: string, option: string) {
    setCheckedOptions((prev) => {
      const current = prev[questionId] ?? [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: next };
    });
    if (option === CUSTOM_OPTION) {
      setTimeout(() => customInputRef.current?.focus(), 0);
    }
  }

  const showWizard = !result;
  const primaryDisabled = isAnalyzing || isLoading || !canProceed;

  const primaryLabel = isAnalyzing
    ? "AI가 분석 중..."
    : isLoading
      ? "AI가 추천 작성 중..."
      : isLastStep
        ? "✨ 추천 결과 생성"
        : isWorkStep && !analyzed
          ? "다음"
          : "다음";

  const helperText = isWorkStep
    ? analyzed
      ? "분석이 완료됐습니다. 다음 단계로 진행하세요."
      : "작업 내용을 입력한 뒤 AI 분석을 시작하세요."
    : isLastStep
      ? "모든 질문이 끝났습니다. 추천 결과를 생성하세요."
      : isTroubleshootingStep
        ? "문제가 있었다면 내용을 입력해주세요."
        : "해당하는 항목을 모두 선택할 수 있습니다.";

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
          오늘 작업 내용을 입력하면 AI가 필요한 맥락을 질문하고, 커밋
          메시지와 개발일지를 함께 작성해 드립니다.
        </p>
      </header>

      {showWizard && (
        <Card className="transition-shadow duration-200 hover:shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle>오늘의 작업</CardTitle>
            <CardDescription>
              {isWorkStep
                ? "작업 내용을 입력하면 AI가 부족한 맥락을 질문합니다."
                : isTroubleshootingStep
                  ? "마지막 단계입니다. 트러블슈팅 내용을 확인해주세요."
                  : "해당하는 항목을 모두 선택할 수 있습니다."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div
                className="flex flex-1 items-center gap-2"
                aria-label={`${currentStep + 1} / ${totalSteps} 단계`}
              >
                {Array.from({ length: totalSteps }).map((_, index) => (
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
              <span className="shrink-0 text-xs text-muted-foreground">
                {currentStep + 1}/{totalSteps} ·{" "}
                {getStepLabel(currentStep, questions.length)}
              </span>
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
              {isWorkStep ? (
                <>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="work-input"
                      className="block text-sm font-medium text-foreground"
                    >
                      오늘 무엇을 작업했나요?
                    </label>
                    <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
                      <p>예)</p>
                      <ul className="list-inside list-disc space-y-0.5 pl-0.5">
                        <li>Route Handler 추가</li>
                        <li>Prompt 분리</li>
                        <li>Skeleton UI 추가</li>
                      </ul>
                    </div>
                  </div>
                  <Textarea
                    ref={textareaRef}
                    id="work-input"
                    value={work}
                    onChange={(e) => setWork(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (e.metaKey || e.ctrlKey) &&
                        !primaryDisabled &&
                        !isLastStep
                      ) {
                        e.preventDefault();
                        handlePrimaryAction();
                      }
                    }}
                    placeholder={
                      "OpenAI API 연동\nSkeleton UI 추가\nlocalStorage 자동 저장"
                    }
                    rows={4}
                    className={cn(TEXTAREA_CLASS, "min-h-28")}
                  />
                </>
              ) : isTroubleshootingStep ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">
                    작업 중 문제나 에러가 있었나요?
                  </p>
                  <div className="space-y-2" role="radiogroup">
                    {TROUBLESHOOTING_OPTIONS.map(({ value, label }) => {
                      const isSelected = troubleshootingChoice === value;
                      return (
                        <label
                          key={value}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border/60 hover:bg-muted/30",
                          )}
                        >
                          <input
                            type="radio"
                            name="troubleshooting"
                            value={value}
                            checked={isSelected}
                            onChange={() => {
                              setTroubleshootingChoice(value);
                              if (value !== "none") {
                                setTimeout(
                                  () => troubleshootingInputRef.current?.focus(),
                                  0,
                                );
                              }
                            }}
                            className="size-4 accent-primary"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {(troubleshootingChoice === "error" ||
                    troubleshootingChoice === "custom") && (
                    <Textarea
                      ref={troubleshootingInputRef}
                      value={troubleshootingText}
                      onChange={(e) => setTroubleshootingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          (e.metaKey || e.ctrlKey) &&
                          isLastStep &&
                          !primaryDisabled
                        ) {
                          e.preventDefault();
                          void handleGenerate();
                        }
                      }}
                      placeholder={
                        troubleshootingChoice === "error"
                          ? "에러 메시지나 상황을 입력해주세요"
                          : "문제 상황을 입력해주세요"
                      }
                      rows={3}
                      className={TEXTAREA_CLASS}
                    />
                  )}
                </div>
              ) : currentQuestion ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">
                    {currentQuestion.question}
                  </p>
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => {
                      const isChecked = (
                        checkedOptions[currentQuestion.id] ?? []
                      ).includes(option);
                      return (
                        <label
                          key={option}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                            isChecked
                              ? "border-primary bg-primary/5"
                              : "border-border/60 hover:bg-muted/30",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              toggleCheckbox(currentQuestion.id, option)
                            }
                            className="size-4 rounded accent-primary"
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      );
                    })}
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                        (checkedOptions[currentQuestion.id] ?? []).includes(
                          CUSTOM_OPTION,
                        )
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:bg-muted/30",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={(
                          checkedOptions[currentQuestion.id] ?? []
                        ).includes(CUSTOM_OPTION)}
                        onChange={() =>
                          toggleCheckbox(currentQuestion.id, CUSTOM_OPTION)
                        }
                        className="size-4 rounded accent-primary"
                      />
                      <span className="text-sm">기타</span>
                    </label>
                  </div>
                  {(checkedOptions[currentQuestion.id] ?? []).includes(
                    CUSTOM_OPTION,
                  ) && (
                    <Textarea
                      ref={customInputRef}
                      value={customAnswers[currentQuestion.id] ?? ""}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: e.target.value,
                        }))
                      }
                      placeholder="직접 입력해주세요"
                      rows={2}
                      className={TEXTAREA_CLASS}
                    />
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-border/50 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">{helperText}</p>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleBack}
                    disabled={isAnalyzing || isLoading}
                    className="h-10 px-4 transition-opacity duration-200"
                  >
                    <ChevronLeft className="size-4" />
                    이전
                  </Button>
                )}
                {isLastStep && !isLoading && !isAnalyzing ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="lg"
                          onClick={handlePrimaryAction}
                          disabled={primaryDisabled}
                          className="h-10 px-6 transition-opacity duration-200"
                        />
                      }
                    >
                      {primaryLabel}
                    </TooltipTrigger>
                    <TooltipContent>
                      ⌘ Enter로도 실행할 수 있습니다.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    size="lg"
                    onClick={handlePrimaryAction}
                    disabled={primaryDisabled}
                    className="h-10 gap-2 px-4 sm:px-5 transition-opacity duration-200"
                  >
                    {primaryLabel}
                  </Button>
                )}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

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
            {result && (
              <div
                className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1"
                role="group"
                aria-label="커밋 메시지 언어"
              >
                {COMMIT_LANGUAGES.map((lang) => {
                  const isSelected = commitLanguage === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setCommitLanguage(lang)}
                      aria-pressed={isSelected}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                        isSelected
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {COMMIT_LANGUAGE_LABELS[lang]}
                    </button>
                  );
                })}
              </div>
            )}
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
            {isLoading ? (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : result ? (
              <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/30 px-4 py-3 font-mono text-sm leading-relaxed text-foreground transition-colors duration-200">
                {getCommitMessage(result, commitLanguage)}
              </pre>
            ) : (
              <div className="flex min-h-16 items-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-4">
                <p className="text-sm text-muted-foreground">
                  모든 질문을 마친 뒤 추천 결과 생성을 누르면 커밋 메시지가
                  표시됩니다.
                </p>
              </div>
            )}
          </section>

          <div className="border-t border-border/50" />

          <section className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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

            {isLoading ? (
              <div className="space-y-5 rounded-lg border border-border/60 bg-muted/20 p-4">
                {JOURNAL_SECTIONS.map(({ key }) => (
                  <div key={key} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ))}
              </div>
            ) : result ? (
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
                  모든 질문을 마친 뒤 추천 결과 생성을 누르면 개발일지가
                  표시됩니다.
                </p>
              </div>
            )}
          </section>

          {result && (
            <div className="border-t border-border/50 pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handleNewWork}
                className="h-10 w-full transition-opacity duration-200 sm:w-auto"
              >
                새 작업 시작하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="transition-shadow duration-200 hover:shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle>최근 생성 기록</CardTitle>
            <CardDescription>
              최근 5개의 생성 결과입니다. 클릭하면 다시 볼 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/50 p-0 pt-0">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleHistorySelect(entry)}
                className="flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-muted/30"
              >
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-mono text-sm text-foreground">
                    {entry.commitMessage}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatHistoryTime(entry.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
