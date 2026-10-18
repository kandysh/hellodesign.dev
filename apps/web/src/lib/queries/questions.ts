import type { QuestionDetail, QuestionSummary } from "@sysdesign/types"
import { queryOptions } from "@tanstack/react-query"
import { apiJson } from "@/lib/api-client"

export const questionsQueryOptions = queryOptions({
  queryKey: ["questions"],
  queryFn: (): Promise<QuestionSummary[]> => apiJson("/api/questions"),
})

export const questionQueryOptions = (questionId: string) =>
  queryOptions({
    queryKey: ["question", questionId],
    queryFn: (): Promise<QuestionDetail> => apiJson(`/api/questions/${questionId}`),
  })
