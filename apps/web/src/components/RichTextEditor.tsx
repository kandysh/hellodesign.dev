import { useCallback } from "react"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import {
  FORMAT_TEXT_COMMAND,
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
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { CodeNode } from "@lexical/code"
import { LinkNode } from "@lexical/link"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Toolbar plugin — renders inside the composer context
// ---------------------------------------------------------------------------
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()

  const format = useCallback(
    (type: "bold" | "italic") => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, type)
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

  return (
    <div className="flex items-center gap-1 px-2 py-1 border-b border-base-300 bg-base-200/40">
      <button
        type="button"
        onClick={() => format("bold")}
        title="Bold (Ctrl+B)"
        className="rounded p-1.5 text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors"
      >
        <Bold size={14} />
      </button>
      <button
        type="button"
        onClick={() => format("italic")}
        title="Italic (Ctrl+I)"
        className="rounded p-1.5 text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors"
      >
        <Italic size={14} />
      </button>
      <div className="w-px h-4 bg-base-300 mx-1" />
      <button
        type="button"
        onClick={() => insertList(false)}
        title="Bullet list"
        className="rounded p-1.5 text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors"
      >
        <List size={14} />
      </button>
      <button
        type="button"
        onClick={() => insertList(true)}
        title="Numbered list"
        className="rounded p-1.5 text-base-content/60 hover:bg-base-200 hover:text-base-content transition-colors"
      >
        <ListOrdered size={14} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Placeholder text component
// ---------------------------------------------------------------------------
function Placeholder({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute top-3 left-3 right-3 text-sm text-base-content/40 whitespace-pre-line select-none">
      {text}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface RichTextEditorProps {
  /** Called with markdown-serialized content whenever the editor state changes. */
  onChange: (markdown: string) => void
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string
  className?: string
}

const editorConfig = {
  namespace: "SysDesignEditor",
  nodes: [HeadingNode, QuoteNode, CodeNode, LinkNode, ListNode, ListItemNode],
  onError(error: Error) {
    console.error("[RichTextEditor]", error)
  },
  theme: {
    text: {
      bold: "font-bold",
      italic: "italic",
      underline: "underline",
      strikethrough: "line-through",
    },
    list: {
      ul: "list-disc list-inside my-1",
      ol: "list-decimal list-inside my-1",
      listitem: "ml-4",
    },
    paragraph: "mb-1",
  },
}

/**
 * A Lexical-powered rich text editor with a minimal toolbar.
 * Exposes content as a markdown string via the `onChange` callback.
 */
export function RichTextEditor({ onChange, placeholder, className }: RichTextEditorProps) {
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
                className="h-full min-h-0 p-3 text-sm leading-relaxed focus:outline-none"
                aria-label="Answer editor"
              />
            }
            placeholder={
              <Placeholder text={placeholder ?? "Start typing your answer..."} />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin onChange={handleChange} />
      </div>
    </LexicalComposer>
  )
}
