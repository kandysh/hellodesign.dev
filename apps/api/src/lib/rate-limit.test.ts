import assert from "node:assert/strict"
import test from "node:test"
import { getRateLimitIdentities, getRateLimitPolicies } from "./rate-limit.js"

test("adds focused limits to evaluation and key writes", () => {
  assert.deepEqual(
    getRateLimitPolicies({ method: "POST", url: "/api/submissions/" }).map((policy) => policy.name),
    ["global", "submissions"],
  )
  assert.deepEqual(
    getRateLimitPolicies({ method: "POST", url: "/api/keys/" }).map((policy) => policy.name),
    ["global", "key-validation"],
  )
  assert.deepEqual(
    getRateLimitPolicies({ method: "GET", url: "/api/keys/" }).map((policy) => policy.name),
    ["global"],
  )
})

test("applies community write limits and keys anonymous traffic by session and IP", () => {
  assert.deepEqual(
    getRateLimitPolicies({ method: "POST", url: "/api/community/123/comments" }).map(
      (policy) => policy.name,
    ),
    ["global", "community-writes"],
  )
  assert.deepEqual(
    getRateLimitIdentities({ user: null, sessionId: "guest-session", ip: "192.0.2.5" }),
    ["session:guest-session", "ip:192.0.2.5"],
  )
  assert.deepEqual(
    getRateLimitIdentities({
      user: {
        id: "user-1",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        email: "user@example.com",
        emailVerified: false,
        name: "Test User",
        isAdmin: false,
      },
      sessionId: "ignored",
      ip: "192.0.2.5",
    }),
    ["user:user-1"],
  )
})
