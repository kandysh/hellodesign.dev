import type { FastifyRequest } from "fastify"

export interface RateLimitPolicy {
  name: string
  max: number
  windowSeconds: number
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

export function getRateLimitPolicies(
  request: Pick<FastifyRequest, "method" | "url">,
): RateLimitPolicy[] {
  const path = request.url.split("?", 1)[0] ?? request.url
  const policies: RateLimitPolicy[] = [{ name: "global", max: 120, windowSeconds: 60 }]

  if (request.method === "POST" && /^\/api\/submissions\/?$/.test(path)) {
    policies.push({ name: "submissions", max: 5, windowSeconds: 60 })
  }

  if (request.method === "POST" && /^\/api\/keys\/?$/.test(path)) {
    policies.push({ name: "key-validation", max: 5, windowSeconds: 600 })
  }

  if (
    WRITE_METHODS.has(request.method) &&
    (path === "/api/community" || path.startsWith("/api/community/"))
  ) {
    policies.push({ name: "community-writes", max: 20, windowSeconds: 60 })
  }

  return policies
}

export function getRateLimitIdentities(
  request: Pick<FastifyRequest, "user" | "sessionId" | "ip">,
): string[] {
  if (request.user?.id) return [`user:${request.user.id}`]
  if (request.sessionId) return [`session:${request.sessionId}`, `ip:${request.ip}`]
  return [`ip:${request.ip}`]
}

export const consumeRateLimitScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return { count, redis.call("TTL", KEYS[1]) }
`
