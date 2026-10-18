import type { EvalJobData, FollowupJobData } from "@sysdesign/shared"
import { Queue } from "bullmq"
import { Redis } from "ioredis"

export {
  consumeAndCloseFollowupWait,
  FOLLOWUP_REPLY_CONSUME_SCRIPT,
  FOLLOWUP_REPLY_PUBLISH_SCRIPT,
  FOLLOWUP_REPLY_TAKE_SCRIPT,
  FOLLOWUP_WAIT_OPEN_SCRIPT,
  followupReplyChannel,
  followupReplyKey,
  followupWaitKey,
  openFollowupWait,
  publishFollowupReply,
  takeFollowupReply,
} from "./followup.js"

export type { EvalJobData, FollowupJobData }

export const QUEUES = {
  EVAL: "eval",
  DEEP_EVAL: "deep-eval",
} as const

export interface SubmissionOwner {
  userId?: string
  sessionId?: string
}

function pendingEvalKey(owner: SubmissionOwner): string {
  const id = owner.userId
    ? `user:${owner.userId}`
    : owner.sessionId
      ? `session:${owner.sessionId}`
      : null
  if (!id) throw new Error("A user or session ID is required to reserve an evaluation slot")
  return `pending-evaluations:${id}`
}

const reserveEvalSlotScript = `
local now = tonumber(ARGV[1])
local expiresAt = tonumber(ARGV[2])
local maxPending = tonumber(ARGV[3])
redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now)
if redis.call("ZSCORE", KEYS[1], ARGV[4]) then
  redis.call("ZADD", KEYS[1], expiresAt, ARGV[4])
  redis.call("EXPIRE", KEYS[1], ARGV[5])
  return 2
end
if redis.call("ZCARD", KEYS[1]) >= maxPending then return 0 end
redis.call("ZADD", KEYS[1], expiresAt, ARGV[4])
redis.call("EXPIRE", KEYS[1], ARGV[5])
return 1
`

export async function reserveEvalSlot(
  owner: SubmissionOwner,
  submissionId: string,
  maxPending = 3,
): Promise<boolean> {
  const now = Date.now()
  const ttlSeconds = 60 * 60
  const result = await connection.eval(
    reserveEvalSlotScript,
    1,
    pendingEvalKey(owner),
    String(now),
    String(now + ttlSeconds * 1000),
    String(maxPending),
    submissionId,
    String(ttlSeconds),
  )
  return Number(result) > 0
}

export async function releaseEvalSlot(owner: SubmissionOwner, submissionId: string): Promise<void> {
  const key = pendingEvalKey(owner)
  await connection.eval(
    `redis.call("ZREM", KEYS[1], ARGV[1]); if redis.call("ZCARD", KEYS[1]) == 0 then redis.call("DEL", KEYS[1]) end`,
    1,
    key,
    submissionId,
  )
}

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES]

// Shared Redis connection for queue clients (not workers — workers use their own)
const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

export const evalQueue = new Queue<EvalJobData>(QUEUES.EVAL, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
})

export const deepEvalQueue = new Queue<EvalJobData>(QUEUES.DEEP_EVAL, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
})

export async function closeQueueConnections(): Promise<void> {
  await Promise.all([evalQueue.close(), deepEvalQueue.close()])
}
