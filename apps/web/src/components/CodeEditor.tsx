import { useCallback, useMemo, useState } from "react";
import CodeMirror, { type ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { go } from "@codemirror/lang-go";
import { java } from "@codemirror/lang-java";
import { search } from "@codemirror/search";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { EditorView } from "@codemirror/view";
import { cn } from "@/lib/utils";

// ── Language definitions ───────────────────────────────────────────────────

type LangKey = "javascript" | "typescript" | "python" | "go" | "java";

interface LangDef {
  label: string;
  ext: string;
  extensions: ReactCodeMirrorProps["extensions"];
}

const LANGS: Record<LangKey, LangDef> = {
  javascript: {
    label: "JS",
    ext: ".js",
    extensions: [javascript({ jsx: true })],
  },
  typescript: {
    label: "TS",
    ext: ".ts",
    extensions: [javascript({ jsx: true, typescript: true })],
  },
  python: {
    label: "PY",
    ext: ".py",
    extensions: [python()],
  },
  go: {
    label: "GO",
    ext: ".go",
    extensions: [go()],
  },
  java: {
    label: "JV",
    ext: ".java",
    extensions: [java()],
  },
};

// ── Theme ──────────────────────────────────────────────────────────────────

const codeTheme = createTheme({
  theme: "dark",
  settings: {
    background: "#0b1326",
    foreground: "#dae2fd",
    caret: "#8083ff",
    selection: "rgba(99,102,241,0.3)",
    selectionMatch: "rgba(99,102,241,0.15)",
    lineHighlight: "rgba(128,131,255,0.06)",
    gutterBackground: "#060e20",
    gutterForeground: "#464554",
    gutterBorder: "transparent",
    gutterActiveForeground: "#8083ff",
  },
  styles: [
    // Keywords — primary indigo
    { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "#8083ff", fontWeight: "600" },
    // Control flow
    { tag: t.controlKeyword, color: "#c0c1ff", fontWeight: "600" },
    // Definitions
    { tag: [t.definitionKeyword, t.moduleKeyword], color: "#8083ff" },
    // Functions / methods
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#c0c1ff" },
    { tag: t.definition(t.function(t.variableName)), color: "#dae2fd", fontWeight: "600" },
    // Types / classes
    { tag: [t.typeName, t.className, t.namespace, t.self], color: "#a5b4fc" },
    { tag: t.definition(t.typeName), color: "#c0c1ff", fontWeight: "600" },
    // Variables
    { tag: [t.variableName, t.propertyName], color: "#dae2fd" },
    { tag: t.definition(t.variableName), color: "#dae2fd" },
    // Strings — tertiary green
    { tag: [t.string, t.special(t.string)], color: "#4edea3" },
    { tag: t.regexp, color: "#4edea3", fontStyle: "italic" },
    // Numbers
    { tag: [t.number, t.integer, t.float], color: "#ffb86c" },
    // Booleans / null / undefined
    { tag: [t.bool, t.null, t.atom], color: "#c0c1ff" },
    // Operators & punctuation
    { tag: t.operator, color: "#8083ff" },
    { tag: t.punctuation, color: "#908fa0" },
    { tag: t.bracket, color: "#c7c4d7" },
    // Decorators / meta
    { tag: [t.meta, t.derefOperator], color: "#908fa0" },
    { tag: t.annotation, color: "#4edea3" },
    // Comments — muted
    { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "#464554", fontStyle: "italic" },
    // Errors
    { tag: t.invalid, color: "#ffb4ab", textDecoration: "underline wavy" },
    // Tags (HTML-style in JSX)
    { tag: t.tagName, color: "#8083ff" },
    { tag: t.attributeName, color: "#c0c1ff" },
    { tag: t.attributeValue, color: "#4edea3" },
  ],
});

// ── Scrollbar + search panel CSS overrides ─────────────────────────────────

const editorBaseStyle = EditorView.baseTheme({
  "&": { fontSize: "13px" },
  ".cm-scroller": {
    fontFamily: "'Space Grotesk', ui-monospace, 'Cascadia Code', Menlo, monospace",
    overflowX: "auto",
  },
  ".cm-content": { padding: "12px 0" },
  ".cm-line": { paddingLeft: "8px", paddingRight: "8px" },
  ".cm-gutters": { paddingRight: "8px" },
  // Search panel
  ".cm-search": {
    background: "#131b2e",
    borderTop: "1px solid #222a3d",
    color: "#dae2fd",
    padding: "6px 10px",
    gap: "6px",
  },
  ".cm-search input": {
    background: "#0b1326",
    border: "1px solid #464554",
    borderRadius: "4px",
    color: "#dae2fd",
    padding: "2px 6px",
    outline: "none",
  },
  ".cm-search input:focus": { borderColor: "#8083ff" },
  ".cm-search button": {
    background: "#222a3d",
    border: "1px solid #464554",
    borderRadius: "4px",
    color: "#c0c1ff",
    padding: "2px 8px",
    cursor: "pointer",
    fontSize: "12px",
  },
  ".cm-search button:hover": { background: "#2d3449", borderColor: "#8083ff" },
  // Tooltip / autocomplete
  ".cm-tooltip": {
    background: "#131b2e",
    border: "1px solid #222a3d",
    borderRadius: "6px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    color: "#dae2fd",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    fontFamily: "'Space Grotesk', ui-monospace, monospace",
    fontSize: "12.5px",
    maxHeight: "200px",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    background: "rgba(128,131,255,0.2)",
    color: "#c0c1ff",
  },
  ".cm-completionIcon": { opacity: "0.7" },
  // Active line number
  ".cm-activeLineGutter": { background: "rgba(128,131,255,0.08)", color: "#8083ff" },
  // Folding
  ".cm-foldGutter span": { color: "#464554" },
  ".cm-foldGutter span:hover": { color: "#8083ff" },
});

// ── Language badge colors ─────────────────────────────────────────────────

const LANG_BADGE: Record<LangKey, string> = {
  javascript: "text-yellow-300",
  typescript: "text-blue-400",
  python:     "text-green-400",
  go:         "text-cyan-400",
  java:       "text-orange-400",
};

// ── Props ──────────────────────────────────────────────────────────────────

interface CodeEditorProps {
  value?: string;
  onChange?: (code: string) => void;
  defaultLanguage?: LangKey;
  filename?: string;
  readOnly?: boolean;
  className?: string;
  height?: string;
  placeholder?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export function CodeEditor({
  value,
  onChange,
  defaultLanguage = "javascript",
  filename,
  readOnly = false,
  className,
  height = "100%",
  placeholder = "// Start coding…",
}: CodeEditorProps) {
  const [lang, setLang] = useState<LangKey>(defaultLanguage);

  const handleChange = useCallback((v: string) => onChange?.(v), [onChange]);

  const extensions = useMemo(
    () => [
      ...(LANGS[lang].extensions ?? []),
      search({ top: false }),
      editorBaseStyle,
      EditorView.lineWrapping,
    ],
    [lang],
  );

  const displayFilename = filename ?? `snippet${LANGS[lang].ext}`;

  return (
    <div
      className={cn(
        "flex flex-col h-full overflow-hidden rounded-lg border border-[#222a3d]",
        "bg-[#060e20] shadow-[0_0_0_1px_rgba(128,131,255,0.08),0_4px_24px_rgba(0,0,0,0.4)]",
        className,
      )}
    >
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#222a3d] bg-[#0b1326] shrink-0">
        {/* Dot decorations */}
        <span className="flex gap-1.5 mr-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] opacity-80" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] opacity-80" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] opacity-80" />
        </span>

        {/* Filename */}
        <span className="font-mono text-xs text-[#908fa0] mr-auto">{displayFilename}</span>

        {/* Language tabs */}
        <div
          className="flex items-center gap-0.5 rounded-md bg-[#131b2e] p-0.5 border border-[#222a3d]"
          role="tablist"
          aria-label="Select language"
        >
          {(Object.entries(LANGS) as [LangKey, LangDef][]).map(([key, def]) => (
            <button
              key={key}
              role="tab"
              aria-selected={lang === key}
              onClick={() => setLang(key)}
              className={cn(
                "px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wide transition-all",
                lang === key
                  ? cn("bg-[#222a3d] shadow-sm", LANG_BADGE[key])
                  : "text-[#464554] hover:text-[#908fa0]",
              )}
            >
              {def.label}
            </button>
          ))}
        </div>

        {/* Hint */}
        <span className="hidden sm:block text-[10px] text-[#464554] font-mono select-none">
          ⌃F search
        </span>
      </div>

      {/* ── Editor ─────────────────────────────────────────────────────── */}
      <CodeMirror
        value={value}
        className="flex-1 overflow-auto"
        theme={codeTheme}
        extensions={extensions}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: false,
        }}
        style={{ height }}
      />
    </div>
  );
}
