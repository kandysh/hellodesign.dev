import { Queue } from "bullmq"
import type { EvalJobData } from "@sysdesign/types"
import { redis } from "./redis.js"

export { type EvalJobData }

export const evalQueue = new Queue<EvalJobData>("eval-queue", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
})
