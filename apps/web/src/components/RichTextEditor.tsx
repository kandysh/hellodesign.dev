import { useCallback, useState } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import {
  FORMAT_TEXT_COMMAND,
  $getRoot,
  type EditorState,
} from "lexical"
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list"
import {
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown"
import {
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $createQuoteNode,
} from "@lexical/rich-text"
import { CodeNode } from "@lexical/code"
import { LinkNode } from "@lexical/link"
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { $getSelection, $isRangeSelection } from "lexical"

// ── Toolbar ────────────────────────────────────────────────────────────────

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())

  const format = useCallback(
    (type: "bold" | "italic" | "code") => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, type)
    },
    [editor],
  )

  const setHeading = useCallback(
    (tag: "h1" | "h2") => {
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return
        const seen = new Set<string>()
        selection.getNodes().forEach((node) => {
          const top = node.getTopLevelElementOrThrow()
          if (seen.has(top.getKey())) return
          seen.add(top.getKey())
          const heading = $createHeadingNode(tag)
          top.replace(heading, true)
        })
      })
    },
    [editor],
  )

  const insertList = useCallback(
    (ordered: boolean) => {
      editor.dispatchCommand(
        ordered ? INSERT_ORDERED_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
        undefined,
      )
    },
    [editor],
  )

  const insertDivider = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        // Insert a horizontal rule via markdown
      }
    })
  }, [editor])

  const ToolbarBtn = ({
    onClick,
    title,
    active,
    children,
  }: {
    onClick: () => void
    title: string
    active?: boolean
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "btn btn-ghost btn-xs rounded px-1.5 py-1 text-base-content/50 transition-default hover:bg-base-300/60 hover:text-base-content focus-visible:ring-1 focus-visible:ring-primary",
        active && "bg-base-300/60 text-base-content",
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="flex items-center gap-0.5 border-b border-base-300/40 bg-base-200/60 px-2 py-1.5 flex-wrap">
      <ToolbarBtn onClick={() => format("bold")} title="Bold (Ctrl+B)">
        <Bold size={13} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => format("italic")} title="Italic (Ctrl+I)">
        <Italic size={13} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => format("code")} title="Inline code">
        <Code size={13} />
      </ToolbarBtn>

      <div className="mx-1.5 h-3.5 w-px bg-base-300/60" aria-hidden="true" />

      <ToolbarBtn onClick={() => setHeading("h1")} title="Heading 1">
        <Heading1 size={13} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => setHeading("h2")} title="Heading 2">
        <Heading2 size={13} />
      </ToolbarBtn>

      <div className="mx-1.5 h-3.5 w-px bg-base-300/60" aria-hidden="true" />

      <ToolbarBtn onClick={() => insertList(false)} title="Bullet list">
        <List size={13} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => insertList(true)} title="Numbered list">
        <ListOrdered size={13} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const seen = new Set<string>()
          selection.getNodes().forEach((node) => {
            const top = node.getTopLevelElementOrThrow()
            if (seen.has(top.getKey())) return
            seen.add(top.getKey())
            top.replace($createQuoteNode(), true)
          })
        }
      })} title="Blockquote">
        <Quote size={13} />
      </ToolbarBtn>
    </div>
  )
}

// ── Placeholder ────────────────────────────────────────────────────────────

function Placeholder({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 right-4 select-none whitespace-pre-line text-sm text-base-content/30 leading-relaxed">
      {text}
    </div>
  )
}

// ── Word count plugin ──────────────────────────────────────────────────────

function WordCountPlugin({ onCount }: { onCount: (n: number) => void }) {
  const [editor] = useLexicalComposerContext()
  editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      const root = $getRoot()
      const text = root.getTextContent()
      const words = text.trim() ? text.trim().split(/\s+/).length : 0
      onCount(words)
    })
  })
  return null
}

// ── Editor config ──────────────────────────────────────────────────────────

const editorConfig = {
  namespace: "SysDesignEditor",
  nodes: [HeadingNode, QuoteNode, CodeNode, LinkNode, ListNode, ListItemNode],
  onError(error: Error) {
    console.error("[RichTextEditor]", error)
  },
  theme: {
    text: {
      bold:          "font-bold",
      italic:        "italic",
      underline:     "underline",
      strikethrough: "line-through",
      code:          "font-mono text-sm bg-base-300/60 px-1.5 py-0.5 rounded text-accent",
    },
    heading: {
      h1: "text-2xl font-bold mt-4 mb-2",
      h2: "text-xl font-semibold mt-3 mb-2",
    },
    quote: "border-l-4 border-primary/40 pl-4 italic text-base-content/60 my-2",
    list: {
      ul:       "list-disc list-inside mb-2 space-y-0.5",
      ol:       "list-decimal list-inside mb-2 space-y-0.5",
      listitem: "ml-4 text-base-content/90",
    },
    code:      "font-mono text-sm bg-base-300/60 p-3 rounded-lg my-2 block overflow-x-auto",
    paragraph: "mb-1",
  },
}

// ── Public component ───────────────────────────────────────────────────────

interface RichTextEditorProps {
  onChange: (markdown: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function RichTextEditor({
  onChange,
  placeholder,
  className,
  autoFocus = false,
}: RichTextEditorProps) {
  const [wordCount, setWordCount] = useState(0)

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const markdown = $convertToMarkdownString(TRANSFORMERS)
        onChange(markdown)
      })
    },
    [onChange],
  )

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className={cn("flex flex-col h-full", className)}>
        <ToolbarPlugin />

        <div className="relative flex-1 overflow-auto">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="lexical-prose h-full min-h-[400px] p-4 text-sm focus:outline-none"
                aria-label="Answer editor"
              />
            }
            placeholder={
              <Placeholder text={placeholder ?? "Start writing your answer…"} />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        <div className="flex items-center justify-end border-t border-base-300/40 bg-base-200/40 px-3 py-1.5">
          <span className="text-xs text-base-content/30">
            {wordCount} word{wordCount !== 1 ? "s" : ""}
          </span>
        </div>

        <HistoryPlugin />
        <ListPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        {autoFocus && <AutoFocusPlugin />}
        <OnChangePlugin onChange={handleChange} />
        <WordCountPlugin onCount={setWordCount} />
      </div>
    </LexicalComposer>
  )
}
