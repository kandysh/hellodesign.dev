import type { Processor } from "bullmq"
import { db } from "@sysdesign/db"
import type { FollowupJobData } from "@sysdesign/shared"
import { redisPub, submissionChannel, replyChannel } from "../lib/redis.js"
import type { AgentEvent } from "@sysdesign/shared"

/**
 * Followup processor — handles cases where a user reply arrives after the eval
 * worker has already timed out waiting. It persists the message and re-publishes
 * to the reply channel so any re-enqueued eval job can pick it up.
 */
export const followupProcessor: Processor<FollowupJobData> = async (job) => {
  const { submissionId, replyContent } = job.data

  console.log(`[followup] Processing reply for submission ${submissionId}`)

  const submission = await db.submission.findUnique({ where: { id: submissionId } })
  if (!submission) {
    console.warn(`[followup] Submission ${submissionId} not found`)
    return
  }

  // Persist the reply message if not already saved
  const existingMsg = await db.agentMessage.findFirst({
    where: {
      submissionId,
      role: "USER",
      content: replyContent,
    },
  })

  if (!existingMsg) {
    await db.agentMessage.create({
      data: {
        submissionId,
        role: "USER",
        content: replyContent,
        metadata: { type: "followup_reply", source: "followup_queue" },
      },
    })
  }

  // Re-publish to Redis so any waiting eval worker can receive it
  await redisPub.set(`submission:${submissionId}:reply`, replyContent, "EX", 360)
  await redisPub.publish(replyChannel(submissionId), replyContent)

  // Publish SSE event so the client knows the reply was received
  const event: AgentEvent = { type: "user_reply", content: replyContent }
  await redisPub.publish(submissionChannel(submissionId), JSON.stringify(event))

  console.log(`[followup] Reply persisted and published for ${submissionId}`)
}
