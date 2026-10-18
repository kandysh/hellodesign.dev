import type { SceneData } from "@excalidraw/excalidraw/types"
import { useEffect, useState } from "react"
import type { CodeLanguage } from "@/components/CodeEditor"

export function useDraft(questionId: string) {
  const [answerCode, setAnswerCode] = useState("")
  const [codeSnippet, setCodeSnippet] = useState("")
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>("javascript")
  const [excalidrawData, setExcalidrawData] = useState<SceneData | null>(null)
  const [hasExcalidrawElements, setHasExcalidrawElements] = useState(false)
  const [diagramResetKey, setDiagramResetKey] = useState(0)
  const [checklist, setChecklist] = useState<Set<string>>(new Set())
  const [draftRestored, setDraftRestored] = useState(false)
  const draftKey = `workspace_draft_${questionId}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const {
        code,
        codeSnippet: savedCodeSnippet,
        codeLanguage: savedCodeLanguage,
        diagramElements,
        checklist: savedChecklist,
        savedAt,
      } = JSON.parse(raw)
      if (typeof code === "string") setAnswerCode(code)
      if (typeof savedCodeSnippet === "string") setCodeSnippet(savedCodeSnippet)
      if (typeof savedCodeLanguage === "string") setCodeLanguage(savedCodeLanguage as CodeLanguage)
      if (Array.isArray(diagramElements)) {
        setExcalidrawData({ elements: diagramElements as SceneData["elements"] })
        setHasExcalidrawElements(diagramElements.length > 0)
      }
      if (Array.isArray(savedChecklist)) setChecklist(new Set(savedChecklist))
      const mins = Math.round((Date.now() - Number(savedAt)) / 60_000)
      if (
        code?.trim().length > 0 ||
        savedCodeSnippet?.trim().length > 0 ||
        diagramElements?.length > 0
      ) {
        setDraftRestored(Number.isFinite(mins) && mins <= 10_080)
      }
    } catch {
      // Ignore invalid or outdated draft data.
    }
  }, [draftKey])

  useEffect(() => {
    if (!answerCode.trim() && !codeSnippet.trim() && !hasExcalidrawElements) return
    const id = setInterval(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            code: answerCode,
            codeSnippet,
            codeLanguage,
            diagramElements: excalidrawData?.elements ?? [],
            checklist: [...checklist],
            savedAt: Date.now(),
          }),
        )
      } catch {
        // Ignore storage quota errors; editing remains available in memory.
      }
    }, 30_000)
    return () => clearInterval(id)
  }, [
    answerCode,
    codeSnippet,
    codeLanguage,
    excalidrawData,
    hasExcalidrawElements,
    checklist,
    draftKey,
  ])

  function clearDraft() {
    localStorage.removeItem(draftKey)
    setAnswerCode("")
    setCodeSnippet("")
    setExcalidrawData(null)
    setHasExcalidrawElements(false)
    setDiagramResetKey((key) => key + 1)
    setChecklist(new Set())
    setDraftRestored(false)
  }

  return {
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
    setDiagramResetKey,
    checklist,
    setChecklist,
    draftRestored,
    clearDraft,
  }
}
