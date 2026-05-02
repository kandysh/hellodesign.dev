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

const codeThemeDark = createTheme({
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
    {
      tag: [t.keyword, t.modifier, t.operatorKeyword],
      color: "#8083ff",
      fontWeight: "600",
    },
    // Control flow
    { tag: t.controlKeyword, color: "#c0c1ff", fontWeight: "600" },
    // Definitions
    { tag: [t.definitionKeyword, t.moduleKeyword], color: "#8083ff" },
    // Functions / methods
    {
      tag: [t.function(t.variableName), t.function(t.propertyName)],
      color: "#c0c1ff",
    },
    {
      tag: t.definition(t.function(t.variableName)),
      color: "#dae2fd",
      fontWeight: "600",
    },
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
    {
      tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
      color: "#464554",
      fontStyle: "italic",
    },
    // Errors
    { tag: t.invalid, color: "#ffb4ab", textDecoration: "underline wavy" },
    // Tags (HTML-style in JSX)
    { tag: t.tagName, color: "#8083ff" },
    { tag: t.attributeName, color: "#c0c1ff" },
    { tag: t.attributeValue, color: "#4edea3" },
  ],
});

const codeThemeLight = createTheme({
  theme: "light",
  settings: {
    background: "#f8f8f8",
    foreground: "#333333",
    caret: "#6366f1",
    selection: "rgba(99,102,241,0.2)",
    selectionMatch: "rgba(99,102,241,0.1)",
    lineHighlight: "rgba(99,102,241,0.05)",
    gutterBackground: "#f0f0f0",
    gutterForeground: "#999999",
    gutterBorder: "transparent",
    gutterActiveForeground: "#6366f1",
  },
  styles: [
    { tag: [t.keyword, t.modifier, t.operatorKeyword], color: "#6366f1", fontWeight: "600" },
    { tag: t.controlKeyword, color: "#5a5aff", fontWeight: "600" },
    { tag: [t.definitionKeyword, t.moduleKeyword], color: "#6366f1" },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#5a5aff" },
    { tag: t.definition(t.function(t.variableName)), color: "#333333", fontWeight: "600" },
    { tag: [t.typeName, t.className, t.namespace, t.self], color: "#6366f1" },
    { tag: t.definition(t.typeName), color: "#5a5aff", fontWeight: "600" },
    { tag: [t.variableName, t.propertyName], color: "#333333" },
    { tag: t.definition(t.variableName), color: "#333333" },
    { tag: [t.string, t.special(t.string)], color: "#179b6e" },
    { tag: t.regexp, color: "#179b6e", fontStyle: "italic" },
    { tag: [t.number, t.integer, t.float], color: "#d97706" },
    { tag: [t.bool, t.null, t.atom], color: "#5a5aff" },
    { tag: t.operator, color: "#6366f1" },
    { tag: t.punctuation, color: "#666666" },
    { tag: t.bracket, color: "#666666" },
    { tag: [t.meta, t.derefOperator], color: "#666666" },
    { tag: t.annotation, color: "#179b6e" },
    { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "#999999", fontStyle: "italic" },
    { tag: t.invalid, color: "#dc2626", textDecoration: "underline wavy" },
    { tag: t.tagName, color: "#6366f1" },
    { tag: t.attributeName, color: "#5a5aff" },
    { tag: t.attributeValue, color: "#179b6e" },
  ],
});

function getEditorBaseStyle(theme: "dark" | "light") {
  if (theme === "light") {
    return EditorView.baseTheme({
      "&": { fontSize: "13px" },
      ".cm-scroller": {
        fontFamily: "'Space Grotesk', ui-monospace, 'Cascadia Code', Menlo, monospace",
        overflowX: "auto",
      },
      ".cm-content": { padding: "12px 0" },
      ".cm-line": { paddingLeft: "8px", paddingRight: "8px" },
      ".cm-gutters": { paddingRight: "8px" },
      ".cm-search": {
        background: "#f0f0f0",
        borderTop: "1px solid #e5e5e5",
        color: "#333333",
        padding: "6px 10px",
        gap: "6px",
      },
      ".cm-search input": {
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        color: "#333333",
        padding: "2px 6px",
        outline: "none",
      },
      ".cm-search input:focus": { borderColor: "#6366f1" },
      ".cm-search button": {
        background: "#f3f4f6",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        color: "#333333",
        padding: "2px 8px",
        cursor: "pointer",
        fontSize: "12px",
      },
      ".cm-search button:hover": { background: "#e5e7eb", borderColor: "#6366f1" },
      ".cm-tooltip": {
        background: "#ffffff",
        border: "1px solid #e5e5e5",
        borderRadius: "6px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        color: "#333333",
      },
      ".cm-tooltip.cm-tooltip-autocomplete > ul": {
        fontFamily: "'Space Grotesk', ui-monospace, monospace",
        fontSize: "12.5px",
        maxHeight: "200px",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        background: "rgba(99, 102, 241, 0.1)",
        color: "#6366f1",
      },
      ".cm-completionIcon": { opacity: "0.7" },
      ".cm-activeLineGutter": {
        background: "rgba(99, 102, 241, 0.08)",
        color: "#6366f1",
      },
      ".cm-foldGutter span": { color: "#d1d5db" },
      ".cm-foldGutter span:hover": { color: "#6366f1" },
    });
  }
  return EditorView.baseTheme({
  "&": { fontSize: "13px" },
  ".cm-scroller": {
    fontFamily:
      "'Space Grotesk', ui-monospace, 'Cascadia Code', Menlo, monospace",
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
  ".cm-activeLineGutter": {
    background: "rgba(128,131,255,0.08)",
    color: "#8083ff",
  },
  // Folding
  ".cm-foldGutter span": { color: "#464554" },
  ".cm-foldGutter span:hover": { color: "#8083ff" },
  });
}

// ── Language badge colors ─────────────────────────────────────────────────

const LANG_BADGE: Record<LangKey, string> = {
  javascript: "text-yellow-300",
  typescript: "text-blue-400",
  python: "text-green-400",
  go: "text-cyan-400",
  java: "text-orange-400",
};

const LANG_BADGE_COLORS: Record<LangKey, string> = {
  javascript: "#fbbf24",
  typescript: "#60a5fa",
  python: "#4ade80",
  go: "#22d3ee",
  java: "#fb923c",
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
  theme?: "dark" | "light";
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
  theme = "dark",
}: CodeEditorProps) {
  const [lang, setLang] = useState<LangKey>(defaultLanguage);

  const handleChange = useCallback((v: string) => onChange?.(v), [onChange]);

  const extensions = useMemo(
    () => [
      ...(LANGS[lang].extensions ?? []),
      search({ top: false }),
      getEditorBaseStyle(theme),
      EditorView.lineWrapping,
    ],
    [lang, theme],
  );

  const displayFilename = filename ?? `snippet${LANGS[lang].ext}`;

  return (
    <div
      className={cn(
        "flex flex-col h-full overflow-hidden rounded-lg border",
        className,
      )}
      style={{
        borderColor: theme === "light" ? "#e5e5e5" : "var(--app-border)",
        background: theme === "light" ? "#fafafa" : "#0a0e1a",
        boxShadow: theme === "light" 
          ? "0 0 0 1px rgba(0,0,0,0.05), 0 4px 24px rgba(0,0,0,0.08)"
          : "0 0 0 1px rgba(128,131,255,0.08), 0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div 
        className="flex items-center gap-2 px-3 py-2 border-b shrink-0 w-full"
        style={{
          background: theme === "light" ? "#f8f8f8" : "#0b1326",
          borderColor: theme === "light" ? "#e5e5e5" : "var(--app-border)",
        }}
      >
        {/* Dot decorations */}
        <span className="flex gap-1.5 mr-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] opacity-80" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] opacity-80" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] opacity-80" />
        </span>

        {/* Filename */}
        <span 
          className="font-mono text-xs mr-auto"
          style={{ color: theme === "light" ? "#666666" : "#c0c1ff" }}
        >
          {displayFilename}
        </span>

        {/* Language tabs */}
        <div
          className="flex items-center gap-0.5 rounded-md p-0.5 border"
          role="tablist"
          aria-label="Select language"
          style={{
            background: theme === "light" ? "#f0f0f0" : "#131b2e",
            borderColor: theme === "light" ? "#d1d5db" : "#222a3d",
          }}
        >
          {(Object.entries(LANGS) as [LangKey, LangDef][]).map(([key, def]) => (
            <button
              key={key}
              role="tab"
              aria-selected={lang === key}
              onClick={() => setLang(key)}
              className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wide transition-all"
              style={{
                background: lang === key 
                  ? (theme === "light" ? "#ffffff" : "#222a3d")
                  : "transparent",
                color: lang === key 
                  ? LANG_BADGE_COLORS[key]
                  : (theme === "light" ? "#999999" : "#908fa0"),
                boxShadow: lang === key ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {def.label}
            </button>
          ))}
        </div>

        {/* Hint */}
        <span 
          className="hidden sm:block text-[10px] font-mono select-none"
          style={{ color: theme === "light" ? "#999999" : "#908fa0" }}
        >
          ⌃F search
        </span>
        
        {/* Right spacer - fills remaining area with theme background */}
        <div className="flex-1" />
      </div>

      {/* ── Editor ─────────────────────────────────────────────────────── */}
      <CodeMirror
        value={value}
        className="flex-1 overflow-auto"
        theme={theme === "light" ? "light" : codeThemeDark}
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
