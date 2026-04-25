import { Redis } from "ioredis"

export const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

export const redisSub = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

export function evalChannel(submissionId: string) {
  return `eval:${submissionId}`
}
