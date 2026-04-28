import { Redis } from "ioredis"

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

export function submissionChannel(submissionId: string) {
  return `submission:${submissionId}:events`
}

export function replyChannel(submissionId: string) {
  return `submission:${submissionId}:reply`
}

export function replyKey(submissionId: string) {
  return `submission:${submissionId}:reply`
}
