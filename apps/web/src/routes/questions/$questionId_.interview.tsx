import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/questions/$questionId_/interview")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/questions/$questionId",
      params: { questionId: params.questionId },
    })
  },
})
