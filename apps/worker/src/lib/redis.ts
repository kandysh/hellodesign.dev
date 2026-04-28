import { Redis } from "ioredis"

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379"

// Publisher — used to push events to the SSE channel
export const redisPub = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

// Separate connection for pub/sub subscriptions (cannot be reused for commands)
export function createSubscriber() {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}

export function submissionChannel(submissionId: string) {
  return `submission:${submissionId}:events`
}

export function replyChannel(submissionId: string) {
  return `submission:${submissionId}:reply`
}
