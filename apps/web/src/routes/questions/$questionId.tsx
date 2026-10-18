import type { ExcalidrawProps } from "@excalidraw/excalidraw/types"
import { getDefaultModelName } from "@sysdesign/shared"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  FileText,
  Layers,
  ListTodo,
  Lock,
  Map as MapIcon,
  Square,
  Unlock,
  X,
  Zap,
} from "lucide-react"
import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AgentPanel } from "@/components/AgentPanel"
import { DifficultyBadge } from "@/components/DifficultyBadge"
import { ModelCombobox } from "@/components/ModelCombobox"
import { RichTextEditor } from "@/components/RichTextEditor"
import { useToast } from "@/components/Toast"
import { useDraft } from "@/hooks/useDraft"
import { useSubmissionStream } from "@/hooks/useSubmissionStream"
import { useTheme } from "@/hooks/useTheme"
import { apiJson } from "@/lib/api-client"
import { questionQueryOptions } from "@/lib/queries/questions"
import { cn } from "@/lib/utils"

const Excalidraw = lazy(() =>
  import("@excalidraw/excalidraw").then((m) => ({ default: m.Excalidraw })),
)
const CodeEditor = lazy(() =>
  import("@/components/CodeEditor").then((module) => ({ default: module.CodeEditor })),
)

const EXCALIDRAW_UI_OPTIONS = { canvasActions: { export: false } } as const

const EDITOR_PLACEHOLDER = `# Requirements\n\nDescribe the users, core flows, and reliability goals.\n\n## Architecture\n\nExplain the main components and how requests move through the system.\n\n## Data and trade-offs\n\nCapture your choices, alternatives, and failure modes.`

const CHECKLIST_ITEMS = [
  "Functional requirements",
  "Scale estimates",
  "Core components",
  "Data model",
  "API design",
  "Bottlenecks & trade-offs",
]

export const Route = createFileRoute("/questions/$questionId")({
  loader: ({ context: { queryClient }, params: { questionId } }) =>
    queryClient.prefetchQuery(questionQueryOptions(questionId)),
  component: WorkspacePage,
})

function useElapsedTimer() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function WorkspacePage() {
  const { questionId } = Route.useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { theme } = useTheme()
  const [agentVisible, setAgentVisible] = useState(true)
  const { data: providerKeys, isLoading: providerKeysLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => apiJson<Array<{ baseUrl: string | null }>>("/api/keys"),
  })
  const hasProviderKey = (providerKeys?.length ?? 0) > 0
  const elapsed = useElapsedTimer()
  // Panel state
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<"overview" | "checklist">("overview")
  const [hintsOpen, setHintsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"notebook" | "diagram" | "code">("notebook")
  const [codeEditorMounted, setCodeEditorMounted] = useState(false)
  const [reviewMode, setReviewMode] = useState<"quick" | "deep">("quick")
  const [mood, setMood] = useState<"pragmatist" | "systems" | "sre" | "pm">("pragmatist")
  const [modelName, setModelName] = useState(getDefaultModelName())
  const [modelOverridden, setModelOverridden] = useState(false)
  const [apiBannerDismissed, setApiBannerDismissed] = useState(false)

  useEffect(() => {
    if (!modelOverridden) {
      setModelName(getDefaultModelName(providerKeys?.[0]?.baseUrl, reviewMode))
    }
  }, [modelOverridden, providerKeys, reviewMode])

  const {
    answerCode,
    setAnswerCode,
    codeSnippet,
    setCodeSnippet,
    codeLanguage,
    setCodeLanguage,
    excalidrawData,
    setExcalidrawData,
    hasExcalidrawElements,
    setHasExcalidrawElements,
    diagramResetKey,
    checklist,
    setChecklist,
    draftRestored,
    clearDraft,
  } = useDraft(questionId)

  // Keep the canvas lazy until the notebook is mounted.
  const [diagramMounted, setDiagramMounted] = useState(false)

  const handleExcalidrawChange = useCallback<NonNullable<ExcalidrawProps["onChange"]>>(
    (elements, appState) => {
      setExcalidrawData({ elements, appState })
      setHasExcalidrawElements(Array.isArray(elements) && elements.length > 0)
    },
    [setExcalidrawData, setHasExcalidrawElements],
  )

  const { data: question, isLoading } = useQuery(questionQueryOptions(questionId))

  const formattedAnswer = [
    answerCode.trim(),
    codeSnippet.trim()
      ? `## Code sketch\n\n\`\`\`${codeLanguage}\n${codeSnippet.trim()}\n\`\`\``
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")
  // Word count reflects text and code included in the submitted notebook.
  const wordCount = formattedAnswer.trim() ? formattedAnswer.trim().split(/\s+/).length : 0
  const checklistProgress = checklist.size
  const checklistTotal = CHECKLIST_ITEMS.length

  function toggleChecklist(item: string) {
    setChecklist((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
  }

  const { submitMutation, agentState, agentMessages, riskFlags, handleSendAgentMessage } =
    useSubmissionStream({
      questionId,
      answerText: formattedAnswer,
      excalidrawElements: excalidrawData?.elements ?? [],
      reviewMode,
      mood,
      modelName,
      modelOverridden,
      question,
      toast,
      onSubmissionStarted: () => setAgentVisible(true),
    })
  useEffect(() => {
    if (activeTab === "notebook") setDiagramMounted(true)
  }, [activeTab])

  // canSubmit must be declared before the keyboard shortcut useEffect
  // so the dep array can evaluate it without TDZ error
  const canSubmit = formattedAnswer.trim().length > 20

  // ── Keyboard shortcut: Cmd/Ctrl+Enter → submit ────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (canSubmit && !submitMutation.isPending && !submitMutation.isSuccess) {
          submitMutation.mutate()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, submitMutation.isPending, submitMutation.isSuccess, submitMutation.mutate])

  const renderDiagramCanvas = (className: string) => (
    <div className={className}>
      <Suspense
        fallback={
          <div
            className="flex h-full items-center justify-center gap-2 text-sm"
            style={{ color: "var(--app-muted)" }}
          >
            <span
              className="h-4 w-4 animate-spin rounded-full border-2"
              style={{ borderColor: "var(--app-border)", borderTopColor: "var(--app-indigo)" }}
            />
            Loading canvas…
          </div>
        }
      >
        <Excalidraw
          key={diagramResetKey}
          theme={theme}
          UIOptions={EXCALIDRAW_UI_OPTIONS}
          initialData={
            excalidrawData
              ? {
                  elements: excalidrawData.elements ?? [],
                  appState: excalidrawData.appState ?? {},
                }
              : undefined
          }
          onChange={handleExcalidrawChange}
        />
      </Suspense>
    </div>
  )

  const handleViewFeedback = useCallback(
    (submissionId: string) => {
      navigate({
        to: "/questions/$questionId/result/$submissionId",
        params: { questionId, submissionId },
      } as never)
    },
    [navigate, questionId],
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        <div
          className="animate-pulse rounded-lg"
          style={{ background: "var(--app-surface)", height: 32, width: 256 }}
        />
        <div
          className="animate-pulse rounded"
          style={{ background: "var(--app-surface)", height: 16, width: 384, marginTop: 8 }}
        />
        <div
          className="animate-pulse rounded-xl"
          style={{ background: "var(--app-surface)", height: 500, width: "100%", marginTop: 16 }}
        />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex h-64 items-center justify-center" style={{ color: "var(--app-muted)" }}>
        Question not found.
      </div>
    )
  }

  return (
    <div className="practice-workspace flex h-[calc(100dvh-4rem)] overflow-hidden">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col transition-all duration-200 ease-in-out overflow-hidden shrink-0",
          leftCollapsed ? "w-10" : "w-72",
        )}
        style={{
          background: "var(--app-bg-elevated)",
          borderRight: "1px solid var(--app-border-2)",
        }}
      >
        {/* Sidebar header with collapse + tabs */}
        <div className="shrink-0" style={{ borderBottom: "1px solid var(--app-border-2)" }}>
          {leftCollapsed ? (
            <button
              type="button"
              onClick={() => setLeftCollapsed(false)}
              className="flex w-full items-center justify-center py-3 transition-colors"
              style={{ color: "var(--app-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--app-subtle)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--app-muted)"
              }}
              aria-label="Expand sidebar"
            >
              <ChevronRight size={14} />
            </button>
          ) : (
            <>
              {/* Tab row + collapse button */}
              <div className="flex items-center px-2 pt-2 gap-1">
                <SidebarTabBtn
                  active={sidebarTab === "overview"}
                  onClick={() => setSidebarTab("overview")}
                  icon={<BookOpen size={12} />}
                  label="Problem"
                />
                <SidebarTabBtn
                  active={sidebarTab === "checklist"}
                  onClick={() => setSidebarTab("checklist")}
                  icon={<ListTodo size={12} />}
                  label={
                    checklistProgress > 0
                      ? `Checklist ${checklistProgress}/${checklistTotal}`
                      : "Checklist"
                  }
                />
                <button
                  type="button"
                  onClick={() => setLeftCollapsed(true)}
                  className="ml-auto p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--app-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--app-subtle)"
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--app-muted)"
                    e.currentTarget.style.background = "transparent"
                  }}
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={13} />
                </button>
              </div>

              {/* Checklist progress bar */}
              {checklistProgress > 0 && (
                <div className="px-3 pb-2 pt-1.5">
                  <div
                    className="h-0.5 w-full rounded-full overflow-hidden"
                    style={{ background: "var(--app-border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(checklistProgress / checklistTotal) * 100}%`,
                        background: "var(--app-indigo)",
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!leftCollapsed && (
          <div className="flex-1 overflow-y-auto">
            {/* ── Overview tab ── */}
            {sidebarTab === "overview" && (
              <div className="p-4 space-y-5">
                {/* Question header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DifficultyBadge difficulty={question.difficulty} solid />
                    <span className="text-xs capitalize" style={{ color: "var(--app-muted)" }}>
                      {question.category.replace(/-/g, " ")}
                    </span>
                  </div>
                  <h2
                    className="text-sm font-semibold leading-snug"
                    style={{ color: "var(--app-fg)" }}
                  >
                    {question.title}
                  </h2>
                </div>

                {/* Description */}
                <div>
                  <p
                    className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--app-muted)" }}
                  >
                    Description
                  </p>
                  <div
                    className="max-w-none text-xs leading-relaxed [&_p]:mb-1.5"
                    style={{ color: "var(--app-subtle)" }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.prompt}</ReactMarkdown>
                  </div>
                </div>

                {/* Hints */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: "1px solid var(--app-border)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setHintsOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2">
                      {hintsOpen ? (
                        <Unlock size={12} style={{ color: "var(--app-indigo)" }} />
                      ) : (
                        <Lock size={12} style={{ color: "var(--app-muted)" }} />
                      )}
                      <span style={{ color: hintsOpen ? "var(--app-body)" : "var(--app-subtle)" }}>
                        {hintsOpen ? "Hide hints" : "Reveal hints"}
                      </span>
                    </span>
                    <ChevronRight
                      size={12}
                      className={cn("transition-transform duration-150", hintsOpen && "rotate-90")}
                      style={{ color: "var(--app-muted)" }}
                    />
                  </button>
                  {hintsOpen && (question.hints?.length ?? 0) > 0 && (
                    <div
                      className="px-3 py-2.5 space-y-2"
                      style={{ borderTop: "1px solid var(--app-border)" }}
                    >
                      {question.hints?.map((hint) => (
                        <p
                          key={hint}
                          className="text-xs flex gap-1.5"
                          style={{ color: "var(--app-subtle)" }}
                        >
                          <span className="shrink-0" style={{ color: "rgba(128,131,255,0.5)" }}>
                            ›
                          </span>
                          {hint}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Checklist tab ── */}
            {sidebarTab === "checklist" && (
              <div className="p-4 space-y-5">
                <div>
                  <p
                    className="mb-1 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: "var(--app-muted)" }}
                  >
                    What to cover
                  </p>
                  <p className="text-xs mb-3" style={{ color: "var(--app-muted)" }}>
                    Mark each section as you complete it.
                  </p>
                  <div className="space-y-1">
                    {CHECKLIST_ITEMS.map((item) => {
                      const checked = checklist.has(item)
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleChecklist(item)}
                          className="flex items-center gap-2.5 w-full text-left rounded-lg px-2.5 py-2 transition-all"
                          style={{
                            background: checked ? "var(--app-indigo-10)" : "transparent",
                            color: checked ? "var(--app-body)" : "var(--app-subtle)",
                          }}
                          onMouseEnter={(e) => {
                            if (!checked)
                              e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = checked
                              ? "var(--app-indigo-10)"
                              : "transparent"
                          }}
                        >
                          {checked ? (
                            <CheckSquare
                              size={13}
                              style={{ color: "var(--app-indigo)" }}
                              className="shrink-0"
                            />
                          ) : (
                            <Square
                              size={13}
                              style={{ color: "var(--app-border)" }}
                              className="shrink-0"
                            />
                          )}
                          <span className="text-xs">{item}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Progress summary */}
                <div
                  className="rounded-xl p-3"
                  style={{
                    border: "1px solid var(--app-border)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "var(--app-muted)" }}
                    >
                      Progress
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color:
                          checklistProgress === checklistTotal
                            ? "var(--app-green)"
                            : "var(--app-subtle)",
                      }}
                    >
                      {checklistProgress}/{checklistTotal}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full overflow-hidden"
                    style={{ background: "var(--app-border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(checklistProgress / checklistTotal) * 100}%`,
                        background:
                          checklistProgress === checklistTotal
                            ? "var(--app-green)"
                            : "var(--app-indigo)",
                      }}
                    />
                  </div>
                  {checklistProgress === checklistTotal && (
                    <p className="mt-2 text-xs" style={{ color: "var(--app-green)" }}>
                      ✓ All sections covered — great work!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── Center panel ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 relative">
        {/* Question context bar */}
        <div
          className="flex items-center gap-3 px-4 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--app-border-2)", background: "var(--app-bg)" }}
        >
          <Link
            to="/questions"
            className="flex items-center gap-1 text-xs transition-colors shrink-0"
            style={{ color: "var(--app-muted)" }}
          >
            <ArrowLeft size={11} />
            Questions
          </Link>
          <span className="text-xs" style={{ color: "var(--app-border)" }}>
            /
          </span>
          <span
            className="truncate text-xs font-medium min-w-0"
            style={{ color: "var(--app-subtle)" }}
          >
            {question.title}
          </span>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <DifficultyBadge difficulty={question.difficulty} />
            <span
              className="flex items-center gap-1 text-xs font-mono tabular-nums"
              style={{ color: "var(--app-muted)" }}
            >
              <Clock size={11} />
              {elapsed}
            </span>
          </div>
        </div>

        {/* Draft restored banner */}
        {draftRestored && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 shrink-0"
            style={{
              background: "var(--app-indigo-10)",
              borderBottom: "1px solid var(--app-indigo-15)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--app-indigo)" }}>
              Draft restored — your previous work is loaded.
            </span>
            <button
              type="button"
              onClick={clearDraft}
              className="text-xs underline underline-offset-2 transition-opacity hover:opacity-70 shrink-0"
              style={{ color: "var(--app-indigo)" }}
            >
              Clear draft
            </button>
          </div>
        )}

        {/* API Key Warning Banner */}
        {!providerKeysLoading && !hasProviderKey && !apiBannerDismissed && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
            style={{ background: "var(--app-red-10)", borderBottom: "1px solid var(--app-red-15)" }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: "var(--app-red)" }} className="shrink-0" />
              <span style={{ color: "var(--app-red)" }} className="text-xs font-medium">
                No OpenAI API key set.{" "}
                <Link
                  to="/settings"
                  style={{ color: "var(--app-red)", textDecoration: "underline" }}
                  className="hover:opacity-80 transition-opacity"
                >
                  Add one in Settings
                </Link>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setApiBannerDismissed(true)}
              className="shrink-0 p-0.5 hover:opacity-80 transition-opacity"
              style={{ color: "var(--app-red)" }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Workspace tabs */}
        <div
          className="flex items-center px-4 gap-0"
          style={{ borderBottom: "1px solid var(--app-border-2)", background: "var(--app-bg)" }}
        >
          <TabButton
            active={activeTab === "notebook"}
            onClick={() => setActiveTab("notebook")}
            icon={<BookOpen size={13} />}
            label="Notebook"
          />
          <TabButton
            active={activeTab === "diagram"}
            onClick={() => {
              setActiveTab("diagram")
              setDiagramMounted(true)
            }}
            icon={<MapIcon size={13} />}
            label="Diagram"
          />
          <TabButton
            active={activeTab === "code"}
            onClick={() => {
              setCodeEditorMounted(true)
              setActiveTab("code")
            }}
            icon={<Code2 size={13} />}
            label="Code"
          />
          {hasExcalidrawElements && activeTab !== "diagram" && (
            <span
              className="ml-auto text-xs flex items-center gap-1"
              style={{ color: "var(--app-muted)" }}
            >
              <Layers size={11} style={{ color: "rgba(128,131,255,0.6)" }} />
              Diagram included
            </span>
          )}
        </div>

        {/* Notebook and focused editor views */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === "notebook" && (
            <div
              className="absolute inset-0 overflow-y-auto"
              style={{ background: "var(--app-bg)" }}
            >
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 lg:px-6">
                <div className="flex flex-wrap items-end justify-between gap-3 px-1">
                  <div>
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                      style={{ color: "var(--app-indigo)" }}
                    >
                      Design notes
                    </p>
                    <h2 className="mt-1 text-lg font-semibold" style={{ color: "var(--app-text)" }}>
                      Work through your design
                    </h2>
                    <p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>
                      Use this space for your written answer. Your diagram and code have their own
                      tabs.
                    </p>
                  </div>
                </div>

                <section
                  className="overflow-hidden rounded-2xl border"
                  style={{ borderColor: "var(--app-border)", background: "var(--app-surface)" }}
                >
                  <div
                    className="flex items-center gap-2 border-b px-4 py-3"
                    style={{ borderColor: "var(--app-border)" }}
                  >
                    <FileText size={14} style={{ color: "var(--app-muted)" }} />
                    <span className="text-sm font-medium" style={{ color: "var(--app-text)" }}>
                      Design notes
                    </span>
                    <span className="ml-auto text-[11px]" style={{ color: "var(--app-muted)" }}>
                      Markdown
                    </span>
                  </div>
                  <div className="min-h-[360px] p-2" style={{ height: "min(68vh, 720px)" }}>
                    <RichTextEditor
                      value={answerCode}
                      onChange={setAnswerCode}
                      placeholder={EDITOR_PLACEHOLDER}
                      className="h-full rounded-xl"
                    />
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Focused code view edits the same code included with the submission. */}
          <div
            className="absolute inset-0 p-3"
            style={{ display: activeTab === "code" ? "flex" : "none" }}
          >
            {codeEditorMounted && (
              <Suspense
                fallback={
                  <div className="flex w-full items-center justify-center text-xs text-base-content/50">
                    Loading code editor…
                  </div>
                }
              >
                <CodeEditor
                  value={codeSnippet}
                  onChange={setCodeSnippet}
                  language={codeLanguage}
                  onLanguageChange={setCodeLanguage}
                  filename="implementation"
                  className="w-full"
                  height="100%"
                  placeholder="// Add a focused code or pseudocode example…"
                  theme={theme}
                />
              </Suspense>
            )}
          </div>

          {/* Focused diagram view shares the notebook canvas data. */}
          {diagramMounted && (
            <section
              className="absolute inset-0"
              style={{
                opacity: activeTab === "diagram" ? 1 : 0,
                pointerEvents: activeTab === "diagram" ? "auto" : "none",
              }}
              aria-label="Architecture diagram canvas"
              aria-hidden={activeTab !== "diagram"}
            >
              {activeTab === "diagram" && renderDiagramCanvas("h-full w-full")}
            </section>
          )}
        </div>

        {/* Bottom action bar — clean, compact, modern */}
        <div
          className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-2.5"
          style={{
            borderTop: "1px solid var(--app-border-2)",
            background: "var(--app-bg)",
          }}
        >
          {/* Left: Minimal status indicators */}
          <div className="flex min-w-fit items-center gap-2 text-xs">
            {/* Word count badge */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-full"
              style={{
                background: "var(--app-surface-2)",
                border: "1px solid var(--app-border)",
              }}
            >
              <span
                style={{
                  color:
                    wordCount >= 300
                      ? "var(--app-green)"
                      : wordCount >= 150
                        ? "var(--app-indigo)"
                        : "var(--app-muted)",
                  fontWeight: 600,
                }}
              >
                {wordCount}
              </span>
              <span style={{ color: "var(--app-muted)" }}>words</span>
            </div>

            {/* Diagram indicator badge */}
            {hasExcalidrawElements && (
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-full"
                style={{
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid var(--app-indigo-15)",
                }}
              >
                <Layers size={11} style={{ color: "var(--app-indigo)" }} />
                <span style={{ color: "var(--app-indigo-pale)", fontWeight: 500 }}>Diagram</span>
              </div>
            )}
          </div>

          {/* Center: Primary submit button */}
          <button
            type="button"
            onClick={() => {
              if (!submitMutation.isSuccess) {
                submitMutation.mutate()
              }
            }}
            disabled={!canSubmit || submitMutation.isPending || submitMutation.isSuccess}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-95 disabled:cursor-not-allowed whitespace-nowrap"
            style={
              submitMutation.isSuccess
                ? {
                    background: "var(--app-green-10)",
                    border: "1px solid var(--app-green-15)",
                    color: "var(--app-green)",
                  }
                : canSubmit
                  ? {
                      background: "var(--app-indigo)",
                      border: "1px solid var(--app-indigo-20)",
                      boxShadow: "0 0 16px var(--app-indigo-glow)",
                      color: "#fff",
                    }
                  : {
                      background: "var(--app-indigo-10)",
                      border: "1px solid var(--app-indigo-15)",
                      color: "rgba(128,131,255,0.4)",
                    }
            }
            title={
              !canSubmit && !submitMutation.isSuccess
                ? `Write at least 20 characters (${formattedAnswer.trim().length}/20)`
                : ""
            }
          >
            {submitMutation.isPending ? (
              <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : submitMutation.isSuccess ? (
              <Check size={14} />
            ) : (
              <Zap size={14} />
            )}
            <span>
              {submitMutation.isSuccess
                ? "Submitted"
                : reviewMode === "deep"
                  ? "Deep Interview"
                  : "Submit"}
            </span>
            {canSubmit && !submitMutation.isSuccess && !submitMutation.isPending && (
              <span className="text-[10px] opacity-50 font-mono">⌘↵</span>
            )}
          </button>

          {/* Right: Controls (review + mood + model) */}
          <div className="ml-auto flex flex-wrap items-end justify-end gap-2">
            <label className="flex w-[112px] flex-col gap-1">
              <span
                className="px-1 text-[9px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--app-muted)" }}
              >
                Review
              </span>
              <select
                value={reviewMode}
                onChange={(event) => setReviewMode(event.target.value as "quick" | "deep")}
                title={
                  reviewMode === "deep"
                    ? "The interviewer can ask follow-up questions before evaluation"
                    : "Receive structured feedback without follow-up questions"
                }
                className="h-9 w-full rounded-xl border px-2 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                style={{
                  background: "var(--app-surface)",
                  borderColor: "var(--app-border)",
                  color: "var(--app-text)",
                }}
              >
                <option value="quick">Quick review</option>
                <option value="deep">Deep interview</option>
              </select>
            </label>

            <label className="flex w-[145px] flex-col gap-1">
              <span
                className="px-1 text-[9px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--app-muted)" }}
              >
                Interviewer lens
              </span>
              <select
                value={mood}
                onChange={(event) => setMood(event.target.value as typeof mood)}
                className="h-9 w-full rounded-xl border px-2 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                style={{
                  background: "var(--app-surface)",
                  borderColor: "var(--app-border)",
                  color: "var(--app-text)",
                }}
              >
                <option value="pragmatist">Pragmatist</option>
                <option value="systems">Systems architect</option>
                <option value="sre">Reliability (SRE)</option>
                <option value="pm">Product manager</option>
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <span
                className="px-1 text-[9px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--app-muted)" }}
              >
                Model
              </span>
              <ModelCombobox
                value={modelName}
                onChange={(v) => {
                  setModelName(v)
                  setModelOverridden(true)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right agent panel ───────────────────────────────────── */}
      <div
        className={cn(
          "w-80 shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
          agentVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 w-0",
        )}
      >
        <AgentPanel
          state={agentState}
          messages={agentMessages}
          riskFlags={riskFlags}
          onSendMessage={handleSendAgentMessage}
          onViewFeedback={handleViewFeedback}
          className="h-full"
        />
      </div>
    </div>
  )
}

// ── Tab button ─────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-inset"
      style={{
        borderBottomColor: active ? "var(--app-indigo)" : "transparent",
        color: active ? "var(--app-fg)" : "var(--app-subtle)",
        background: active ? "var(--app-indigo-10)" : "transparent",
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Sidebar tab button ─────────────────────────────────────────────────────

function SidebarTabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all"
      style={{
        background: active ? "var(--app-surface-3)" : "transparent",
        color: active ? "var(--app-fg)" : "var(--app-muted)",
      }}
    >
      {icon}
      {label}
    </button>
  )
}
