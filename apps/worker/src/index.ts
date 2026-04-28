import "./env.js"
import { Worker } from "bullmq"
import { Redis } from "ioredis"
import { QUEUES } from "@sysdesign/queue"
import { evalProcessor } from "./processors/eval.js"
import { followupProcessor } from "./processors/followup.js"

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

const evalWorker = new Worker(QUEUES.EVAL, evalProcessor, {
  connection,
  concurrency: 3,
})

const followupWorker = new Worker(QUEUES.FOLLOWUP, followupProcessor, {
  connection,
  concurrency: 10,
})

evalWorker.on("completed", (job) => {
  console.log(`[eval worker] Job ${job.id} completed`)
})

evalWorker.on("failed", (job, err) => {
  console.error(`[eval worker] Job ${job?.id} failed:`, err.message)
})

followupWorker.on("completed", (job) => {
  console.log(`[followup worker] Job ${job.id} completed`)
})

followupWorker.on("failed", (job, err) => {
  console.error(`[followup worker] Job ${job?.id} failed:`, err.message)
})

async function shutdown() {
  console.log("Shutting down workers...")
  await Promise.all([evalWorker.close(), followupWorker.close()])
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

console.log("🔧 Workers started — eval + followup queues active")
