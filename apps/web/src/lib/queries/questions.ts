import { queryOptions } from "@tanstack/react-query"
import type { QuestionSummary, QuestionDetail } from "@sysdesign/types"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

export const questionsQueryOptions = queryOptions({
  queryKey: ["questions"],
  queryFn: async (): Promise<QuestionSummary[]> => {
    const r = await fetch(`${API}/api/questions`)
    if (!r.ok) throw new Error(`Failed to fetch questions (${r.status})`)
    return r.json()
  },
})

export const questionQueryOptions = (questionId: string) =>
  queryOptions({
    queryKey: ["question", questionId],
    queryFn: async (): Promise<QuestionDetail> => {
      const r = await fetch(`${API}/api/questions/${questionId}`)
      if (!r.ok) throw new Error(`Failed to fetch question (${r.status})`)
      return r.json()
    },
  })
