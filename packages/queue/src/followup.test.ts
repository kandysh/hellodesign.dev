import assert from "node:assert/strict"
import test from "node:test"
import {
  consumeAndCloseFollowupWait,
  FOLLOWUP_REPLY_CONSUME_SCRIPT,
  FOLLOWUP_REPLY_PUBLISH_SCRIPT,
  FOLLOWUP_REPLY_TAKE_SCRIPT,
  FOLLOWUP_WAIT_OPEN_SCRIPT,
  followupReplyKey,
  followupWaitKey,
  openFollowupWait,
  publishFollowupReply,
  takeFollowupReply,
} from "./followup.js"

class MemoryFollowupRedis {
  private readonly values = new Map<string, string>()
  readonly publications: Array<{ channel: string; content: string }> = []

  async eval(script: string, keyCount: number, ...args: Array<string | number>): Promise<unknown> {
    const keys = args.slice(0, keyCount).map(String)
    const values = args.slice(keyCount).map(String)
    const [stateKey = "", replyKey = "", channel = ""] = keys

    if (script === FOLLOWUP_WAIT_OPEN_SCRIPT) {
      this.values.delete(replyKey)
      this.values.set(stateKey, "waiting")
      return 1
    }
    if (script === FOLLOWUP_REPLY_PUBLISH_SCRIPT) {
      if (this.values.get(stateKey) !== "waiting" || this.values.has(replyKey)) return 0
      this.values.set(replyKey, values[0] ?? "")
      this.publications.push({ channel: channel ?? "", content: values[0] ?? "" })
      return 1
    }
    if (script === FOLLOWUP_REPLY_TAKE_SCRIPT || script === FOLLOWUP_REPLY_CONSUME_SCRIPT) {
      const reply = this.values.get(replyKey) ?? null
      if (reply !== null) {
        this.values.delete(replyKey)
        this.values.set(stateKey, "closed")
      } else if (
        script === FOLLOWUP_REPLY_CONSUME_SCRIPT &&
        this.values.get(stateKey) === "waiting"
      ) {
        this.values.set(stateKey, "closed")
      }
      return reply
    }
    throw new Error("Unexpected Redis script")
  }

  setForTest(key: string, value: string) {
    this.values.set(key, value)
  }
}

test("a follow-up reply is published once, consumed, and closes that wait", async () => {
  const redis = new MemoryFollowupRedis()
  await openFollowupWait(redis, "submission-1", 360)

  assert.equal(await publishFollowupReply(redis, "submission-1", "First reply"), true)
  assert.equal(await publishFollowupReply(redis, "submission-1", "Duplicate reply"), false)
  assert.deepEqual(redis.publications, [
    { channel: "submission:submission-1:reply", content: "First reply" },
  ])
  assert.equal(await takeFollowupReply(redis, "submission-1"), "First reply")
  assert.equal(await takeFollowupReply(redis, "submission-1"), null)
  assert.equal(await publishFollowupReply(redis, "submission-1", "Late reply"), false)
})

test("closing a timed-out wait rejects a reply that arrives afterward", async () => {
  const redis = new MemoryFollowupRedis()
  await openFollowupWait(redis, "submission-timeout", 360)

  assert.equal(await consumeAndCloseFollowupWait(redis, "submission-timeout"), null)
  assert.equal(await publishFollowupReply(redis, "submission-timeout", "Too late"), false)
})

test("a new follow-up round clears stale reply data and opens a fresh wait", async () => {
  const redis = new MemoryFollowupRedis()
  redis.setForTest(followupReplyKey("submission-2"), "stale reply")
  redis.setForTest(followupWaitKey("submission-2"), "closed")

  await openFollowupWait(redis, "submission-2", 360)

  assert.equal(await takeFollowupReply(redis, "submission-2"), null)
  assert.equal(await publishFollowupReply(redis, "submission-2", "Current reply"), true)
  assert.equal(await takeFollowupReply(redis, "submission-2"), "Current reply")
})
