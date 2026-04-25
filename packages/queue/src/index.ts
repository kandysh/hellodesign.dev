import { Queue } from "bullmq"
import { Redis } from "ioredis"
import type { EvalJobData, FollowupJobData } from "@sysdesign/shared"

export type { EvalJobData, FollowupJobData }

export const QUEUES = {
  EVAL: "eval",
  FOLLOWUP: "followup",
} as const

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

export const followupQueue = new Queue<FollowupJobData>(QUEUES.FOLLOWUP, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})
