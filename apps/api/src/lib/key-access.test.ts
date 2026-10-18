import assert from "node:assert/strict"
import test from "node:test"
import { apiKeyOwnerWhere, ownsApiKey } from "./key-access.js"

test("scopes API key reads and writes to the authenticated owner", () => {
  const owner = { userId: "user-1", sessionId: "guest-session" }
  assert.deepEqual(apiKeyOwnerWhere(owner), { userId: "user-1" })
  assert.equal(ownsApiKey({ userId: "user-1", sessionId: null }, owner), true)
  assert.equal(ownsApiKey({ userId: "user-2", sessionId: null }, owner), false)
  assert.equal(ownsApiKey({ userId: null, sessionId: "guest-session" }, owner), false)
})

test("scopes guest API keys to the current browser session", () => {
  const owner = { sessionId: "guest-session" }
  assert.deepEqual(apiKeyOwnerWhere(owner), { sessionId: "guest-session" })
  assert.equal(ownsApiKey({ userId: null, sessionId: "guest-session" }, owner), true)
  assert.equal(ownsApiKey({ userId: null, sessionId: "other-session" }, owner), false)
  assert.equal(ownsApiKey({ userId: "user-1", sessionId: "guest-session" }, owner), false)
})
