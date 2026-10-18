import assert from "node:assert/strict"
import test from "node:test"
import { ownsSubmission } from "./submission-access.js"

test("reference access is limited to the signed-in or guest submission owner", () => {
  assert.equal(
    ownsSubmission({ userId: "user-1", sessionId: null }, { userId: "user-1", sessionId: "s1" }),
    true,
  )
  assert.equal(ownsSubmission({ userId: null, sessionId: "s1" }, { sessionId: "s1" }), true)
  assert.equal(ownsSubmission({ userId: null, sessionId: "s1" }, { sessionId: "s2" }), false)
  assert.equal(
    ownsSubmission({ userId: null, sessionId: "s1" }, { userId: "user-1", sessionId: "s1" }),
    false,
  )
  assert.equal(ownsSubmission({ userId: "user-1", sessionId: "s1" }, { sessionId: "s1" }), false)
})
