import { Worker } from "bullmq"
import { Redis } from "ioredis"
import { db, submissions, evaluations, agentResults, questions } from "@sysdesign/db"
import { runEvalWorkflow } from "@sysdesign/ai"
import { eq } from "drizzle-orm"
import type { EvalJobData, SSEEvent } from "@sysdesign/types"

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

const redisPub = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

function evalChannel(submissionId: string) {
  return `eval:${submissionId}`
}

async function publish(submissionId: string, event: SSEEvent) {
  await redisPub.publish(evalChannel(submissionId), JSON.stringify(event))
}

const worker = new Worker<EvalJobData>(
  "eval-queue",
  async (job) => {
    const { submissionId, questionId, userId } = job.data

    console.log(`[worker] Processing submission ${submissionId}`)

    // Update submission status
    await db
      .update(submissions)
      .set({ status: "evaluating", updatedAt: new Date() })
      .where(eq(submissions.id, submissionId))

    // Fetch question and submission
    const [question] = await db.select().from(questions).where(eq(questions.id, questionId))
    const [submission] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))

    if (!question || !submission) {
      throw new Error(`Missing question or submission for job ${job.id}`)
    }

    // Create evaluation record
    const [evaluation] = await db
      .insert(evaluations)
      .values({ submissionId, status: "running" })
      .returning()

    if (!evaluation) throw new Error("Failed to create evaluation record")

    try {
      const result = await runEvalWorkflow(
        {
          question: {
            title: question.title,
            description: question.description,
            rubricHints: question.rubricHints,
          },
          answerText: submission.answerText,
          excalidrawJson: submission.excalidrawJson as Record<string, unknown> | null,
        },
        // onProgress: publish each agent result as it completes
        async ({ agentName, result: agentResult }) => {
          // Insert agent result into DB
          await db.insert(agentResults).values({
            evaluationId: evaluation.id,
            agentName,
            score: agentResult.score,
            strengths: agentResult.strengths,
            weaknesses: agentResult.weaknesses,
            suggestions: agentResult.suggestions,
          })

          // Publish SSE event
          await publish(submissionId, {
            type: "agent:result",
            data: agentResult,
          })
        },
      )

      // Update evaluation with final orchestrator result
      await db
        .update(evaluations)
        .set({
          overallScore: result.orchestrator.overallScore,
          orchestratorResult: result.orchestrator,
          status: "done",
          updatedAt: new Date(),
        })
        .where(eq(evaluations.id, evaluation.id))

      // Update submission status
      await db
        .update(submissions)
        .set({ status: "done", updatedAt: new Date() })
        .where(eq(submissions.id, submissionId))

      // Publish completion event
      await publish(submissionId, {
        type: "evaluation:complete",
        data: {
          evaluationId: evaluation.id,
          orchestrator: result.orchestrator,
        },
      })

      console.log(`[worker] Completed submission ${submissionId} — score: ${result.orchestrator.overallScore}`)
    } catch (error) {
      // Update statuses to failed
      await db
        .update(evaluations)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(evaluations.id, evaluation.id))

      await db
        .update(submissions)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(submissions.id, submissionId))

      await publish(submissionId, {
        type: "evaluation:error",
        data: { message: error instanceof Error ? error.message : "Unknown error" },
      })

      throw error
    }
  },
  {
    connection: redis,
    concurrency: 3,
  },
)

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed`)
})

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message)
})

console.log("🔧 Worker started, waiting for jobs...")
