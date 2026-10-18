import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test from "node:test"
import { Redis } from "ioredis"
import {
  consumeAndCloseFollowupWait,
  followupReplyChannel,
  followupReplyKey,
  followupWaitKey,
  openFollowupWait,
  publishFollowupReply,
  takeFollowupReply,
} from "./followup.js"

const redisUrl = process.env.REDIS_URL
const redisOptions = {
  maxRetriesPerRequest: 1,
  connectTimeout: 2_000,
  retryStrategy: () => null,
}

test(
  "follow-up Lua scripts enforce reply state against real Redis",
  { skip: !redisUrl && "Set REDIS_URL to run the real Redis integration test" },
  async () => {
    const client = new Redis(redisUrl as string, redisOptions)
    const concurrentClient = new Redis(redisUrl as string, redisOptions)
    const subscriber = new Redis(redisUrl as string, redisOptions)
    const submissionId = `redis-integration-${randomUUID()}`
    const stateKey = followupWaitKey(submissionId)
    const replyKey = followupReplyKey(submissionId)
    const channel = followupReplyChannel(submissionId)

    try {
      await subscriber.subscribe(channel)
      const publishedReply = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Timed out waiting for Redis publish")),
          2000,
        )
        subscriber.once("message", (_channel: string, message: string) => {
          clearTimeout(timeout)
          resolve(message)
        })
      })

      await openFollowupWait(client, submissionId, 30)
      const results = await Promise.all([
        publishFollowupReply(client, submissionId, "first"),
        publishFollowupReply(concurrentClient, submissionId, "second"),
      ])

      assert.deepEqual([...results].sort(), [false, true])
      const acceptedReply = results[0] ? "first" : "second"
      assert.equal(await publishedReply, acceptedReply)
      assert.equal(await takeFollowupReply(client, submissionId), acceptedReply)
      assert.equal(await takeFollowupReply(client, submissionId), null)
      assert.equal(await publishFollowupReply(client, submissionId, "late"), false)

      const timedOutSubmission = `${submissionId}-timeout`
      await openFollowupWait(client, timedOutSubmission, 30)
      assert.equal(await consumeAndCloseFollowupWait(client, timedOutSubmission), null)
      assert.equal(await publishFollowupReply(client, timedOutSubmission, "too late"), false)

      const nextRoundSubmission = `${submissionId}-next-round`
      await client.set(followupReplyKey(nextRoundSubmission), "stale")
      await openFollowupWait(client, nextRoundSubmission, 30)
      assert.equal(await takeFollowupReply(client, nextRoundSubmission), null)
      assert.equal(await publishFollowupReply(client, nextRoundSubmission, "current"), true)
      assert.equal(await takeFollowupReply(client, nextRoundSubmission), "current")
    } finally {
      await Promise.allSettled([
        subscriber.unsubscribe(channel),
        client.del(stateKey, replyKey),
        client.del(followupWaitKey(`${submissionId}-timeout`)),
        client.del(followupReplyKey(`${submissionId}-timeout`)),
        client.del(followupWaitKey(`${submissionId}-next-round`)),
        client.del(followupReplyKey(`${submissionId}-next-round`)),
      ])
      await Promise.allSettled([subscriber.quit(), concurrentClient.quit(), client.quit()])
    }
  },
)
