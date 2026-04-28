import { useCallback, useMemo } from "react";
import CodeMirror, { type ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";
import { cn } from "@/lib/utils";

// ── Theme matching "Technical Precision" palette ───────────────────────────

const archTheme = createTheme({
  theme: "dark",
  settings: {
    background: "#0b1326",
    foreground: "#dae2fd",
    caret: "#8083ff",
    selection: "rgba(99,102,241,0.25)",
    selectionMatch: "rgba(99,102,241,0.15)",
    lineHighlight: "rgba(30,42,61,0.6)",
    gutterBackground: "#0b1326",
    gutterForeground: "#464554",
  },
  styles: [
    {
      tag: t.heading1,
      color: "#dae2fd",
      fontWeight: "700",
      fontSize: "1.25em",
    },
    { tag: t.heading2, color: "#c0c1ff", fontWeight: "600", fontSize: "1.1em" },
    { tag: t.heading3, color: "#a8aaff", fontWeight: "600" },
    { tag: t.strong, color: "#dae2fd", fontWeight: "700" },
    { tag: t.emphasis, color: "#c7c4d7", fontStyle: "italic" },
    { tag: t.strikethrough, color: "#908fa0" },
    { tag: t.link, color: "#8083ff", textDecoration: "underline" },
    { tag: t.url, color: "#8083ff" },
    {
      tag: t.monospace,
      color: "#4edea3",
      background: "rgba(78,222,163,0.08)",
      borderRadius: "3px",
      padding: "0 3px",
    },
    { tag: t.quote, color: "#908fa0", fontStyle: "italic" },
    { tag: t.list, color: "#8083ff" },
    { tag: t.punctuation, color: "#464554" },
    { tag: t.meta, color: "#464554" },
    { tag: t.comment, color: "#464554", fontStyle: "italic" },
    { tag: t.keyword, color: "#c0c1ff" },
    { tag: t.string, color: "#4edea3" },
    { tag: t.number, color: "#ffb86c" },
  ],
});

// ── Base editor extensions ─────────────────────────────────────────────────

const baseExtensions: ReactCodeMirrorProps["extensions"] = [
  markdown({ base: markdownLanguage, codeLanguages: languages }),
  EditorView.lineWrapping,
];

// ── Public component ───────────────────────────────────────────────────────

interface RichTextEditorProps {
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function RichTextEditor({
  onChange,
  placeholder,
  className,
  autoFocus = false,
}: RichTextEditorProps) {
  const handleChange = useCallback(
    (value: string) => onChange(value),
    [onChange],
  );

  const extensions = useMemo(() => baseExtensions, []);

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      <CodeMirror
        className="flex-1 overflow-auto text-sm"
        theme={archTheme}
        extensions={extensions}
        onChange={handleChange}
        placeholder={placeholder ?? "Start writing your answer…"}
        autoFocus={autoFocus}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: false,
          autocompletion: true,
          rectangularSelection: false,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: false,
          closeBracketsKeymap: false,
          searchKeymap: false,
          foldKeymap: false,
          completionKeymap: false,
          lintKeymap: false,
        }}
        style={{ height: "100%" }}
      />
    </div>
  );
}
