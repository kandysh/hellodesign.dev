interface RedisEvalClient {
  eval(script: string, keyCount: number, ...args: Array<string | number>): Promise<unknown>
}

export const FOLLOWUP_WAIT_OPEN_SCRIPT = `
redis.call("DEL", KEYS[2])
redis.call("SET", KEYS[1], "waiting", "EX", ARGV[1])
return 1
`

export const FOLLOWUP_REPLY_PUBLISH_SCRIPT = `
if redis.call("GET", KEYS[1]) ~= "waiting" then return 0 end
if redis.call("EXISTS", KEYS[2]) == 1 then return 0 end
redis.call("SET", KEYS[2], ARGV[1], "EX", ARGV[2])
redis.call("PUBLISH", KEYS[3], ARGV[1])
return 1
`

export const FOLLOWUP_REPLY_TAKE_SCRIPT = `
local reply = redis.call("GET", KEYS[2])
if reply then
  redis.call("DEL", KEYS[2])
  redis.call("SET", KEYS[1], "closed", "EX", ARGV[1])
end
return reply
`

export const FOLLOWUP_REPLY_CONSUME_SCRIPT = `
local reply = redis.call("GET", KEYS[2])
if reply then redis.call("DEL", KEYS[2]) end
if redis.call("GET", KEYS[1]) == "waiting" then
  redis.call("SET", KEYS[1], "closed", "EX", ARGV[1])
end
return reply
`

export function followupWaitKey(submissionId: string): string {
  return `submission:${submissionId}:reply-state`
}

export function followupReplyKey(submissionId: string): string {
  return `submission:${submissionId}:reply`
}

export function followupReplyChannel(submissionId: string): string {
  return followupReplyKey(submissionId)
}

export async function openFollowupWait(
  redis: RedisEvalClient,
  submissionId: string,
  ttlSeconds: number,
): Promise<void> {
  await redis.eval(
    FOLLOWUP_WAIT_OPEN_SCRIPT,
    2,
    followupWaitKey(submissionId),
    followupReplyKey(submissionId),
    String(ttlSeconds),
  )
}

export async function publishFollowupReply(
  redis: RedisEvalClient,
  submissionId: string,
  content: string,
  ttlSeconds = 360,
): Promise<boolean> {
  const result = await redis.eval(
    FOLLOWUP_REPLY_PUBLISH_SCRIPT,
    3,
    followupWaitKey(submissionId),
    followupReplyKey(submissionId),
    followupReplyChannel(submissionId),
    content,
    String(ttlSeconds),
  )
  return Number(result) === 1
}

export async function consumeAndCloseFollowupWait(
  redis: RedisEvalClient,
  submissionId: string,
  ttlSeconds = 360,
): Promise<string | null> {
  const result = await redis.eval(
    FOLLOWUP_REPLY_CONSUME_SCRIPT,
    2,
    followupWaitKey(submissionId),
    followupReplyKey(submissionId),
    String(ttlSeconds),
  )
  return typeof result === "string" ? result : null
}

export async function takeFollowupReply(
  redis: RedisEvalClient,
  submissionId: string,
  ttlSeconds = 360,
): Promise<string | null> {
  const result = await redis.eval(
    FOLLOWUP_REPLY_TAKE_SCRIPT,
    2,
    followupWaitKey(submissionId),
    followupReplyKey(submissionId),
    String(ttlSeconds),
  )
  return typeof result === "string" ? result : null
}
