import "./env.js"
import "./lib/types.js"
import { randomUUID } from "node:crypto"
import { Readable } from "node:stream"
import cookie from "@fastify/cookie"
import cors from "@fastify/cors"
import websocket from "@fastify/websocket"
import { auth } from "@sysdesign/auth"
import { db, decryptKey, encryptKey, getCurrentEncryptionKeyVersion } from "@sysdesign/db"
import { closeQueueConnections } from "@sysdesign/queue"
import { fromNodeHeaders, toNodeHandler } from "better-auth/node"
import Fastify from "fastify"
import {
  consumeRateLimitScript,
  getRateLimitIdentities,
  getRateLimitPolicies,
} from "./lib/rate-limit.js"
import { redis } from "./lib/redis.js"
import { API_BODY_LIMIT } from "./lib/request-schemas.js"
import adminRouter from "./routes/admin.js"
import communityRouter from "./routes/community.js"
import keysRouter from "./routes/keys.js"
import meRouter from "./routes/me.js"
import modelsRouter from "./routes/models.js"
import questionsRouter from "./routes/questions.js"
import submissionsRouter from "./routes/submissions.js"

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0)
if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS must be a non-negative integer")
}

const fastify = Fastify({
  logger: { level: "info" },
  trustProxy: trustProxyHops,
  bodyLimit: API_BODY_LIMIT,
})

fastify.addHook("onSend", async (_request, reply, payload) => {
  reply.header(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  )
  reply.header("X-Content-Type-Options", "nosniff")
  reply.header("Referrer-Policy", "no-referrer")
  reply.header("X-Frame-Options", "DENY")
  if (process.env.NODE_ENV === "production") {
    reply.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
  }
  return payload
})

await fastify.register(cors, {
  origin: process.env.WEB_URL ?? "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
})

await fastify.register(cookie)
await fastify.register(websocket, { options: { maxPayload: 16_384 } })

// Intercept /api/auth/* BEFORE body parsing so req.raw is intact for toNodeHandler
const authNodeHandler = toNodeHandler(auth)
fastify.addHook("preParsing", async (req, reply, _payload) => {
  if (!req.url?.startsWith("/api/auth/")) return
  // Flush CORS headers @fastify/cors buffered on reply → reply.raw before hijacking.
  // authNodeHandler writes directly to reply.raw (bypasses Fastify response pipeline),
  // so headers set via reply.header() would be lost otherwise.
  for (const name of ["access-control-allow-origin", "access-control-allow-credentials", "vary"]) {
    const val = reply.getHeader(name)
    if (val !== undefined) reply.raw.setHeader(name, val as string | string[])
  }
  reply.hijack()
  await authNodeHandler(req.raw, reply.raw)
  return Readable.from([])
})

// Augment request with auth context
fastify.decorateRequest("user", null)
fastify.decorateRequest("authSession", null)
fastify.decorateRequest("sessionId", "")

// Auth + anonymous session middleware
fastify.addHook("preHandler", async (req, reply) => {
  const session = await auth.api
    .getSession({ headers: fromNodeHeaders(req.headers) })
    .catch(() => null)
  req.user = session?.user ?? null
  req.authSession = session?.session ?? null

  if (req.url.startsWith("/api/auth/")) return

  let sessionId = req.cookies?.session_id
  if (!sessionId) {
    sessionId = randomUUID()
    void reply.setCookie("session_id", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    })
  }
  req.sessionId = sessionId
})

fastify.addHook("preHandler", async (req, reply) => {
  for (const policy of getRateLimitPolicies(req)) {
    for (const identity of getRateLimitIdentities(req)) {
      const key = `rate-limit:${policy.name}:${identity}`
      const result = (await redis.eval(
        consumeRateLimitScript,
        1,
        key,
        String(policy.windowSeconds),
      )) as [number, number]
      const count = Number(result[0] ?? 0)
      const ttl = Number(result[1] ?? 0)
      if (count > policy.max) {
        reply.header("Retry-After", String(Math.max(1, ttl)))
        return reply.code(429).send({ error: "Too many requests. Please try again later." })
      }
    }
  }
})

// /api/auth/* handled in preParsing hook above
fastify.all("/api/auth/*", async (_req, _reply) => {})

fastify.register(questionsRouter, { prefix: "/api/questions" })
fastify.register(submissionsRouter, { prefix: "/api/submissions" })
fastify.register(keysRouter, { prefix: "/api/keys" })
fastify.register(meRouter, { prefix: "/api/me" })
fastify.register(modelsRouter, { prefix: "/api/models" })
fastify.register(communityRouter, { prefix: "/api/community" })
fastify.register(adminRouter, { prefix: "/api/admin" })

fastify.get("/health", async (_request, reply) => {
  try {
    await db.$queryRaw`SELECT 1`
    await redis.ping()
    return { ok: true }
  } catch {
    return reply.code(503).send({ ok: false })
  }
})

async function migrateLegacyApiKeys() {
  const keys = await db.userApiKey.findMany({
    select: { id: true, encryptedKey: true, iv: true },
  })
  const currentVersionPrefix = `${getCurrentEncryptionKeyVersion()}:`
  let migrated = 0
  for (const record of keys) {
    if (record.encryptedKey.startsWith(currentVersionPrefix)) continue
    let plaintext: string
    try {
      plaintext = decryptKey(record.encryptedKey, record.iv)
    } catch {
      throw new Error(
        `Could not migrate stored API key ${record.id}; preserve its legacy encryption secret and retry startup`,
      )
    }
    const encrypted = encryptKey(plaintext)
    await db.userApiKey.update({
      where: { id: record.id },
      data: encrypted,
    })
    migrated += 1
  }
  if (migrated) fastify.log.info({ migrated }, "Migrated legacy API keys to versioned encryption")
}

await migrateLegacyApiKeys()

const port = Number(process.env.PORT ?? 3001)
await fastify.listen({ port, host: "0.0.0.0" })

let shuttingDown = false
async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  fastify.log.info({ signal }, "Closing API service")
  try {
    await fastify.close()
    await Promise.allSettled([closeQueueConnections(), redis.quit(), db.$disconnect()])
    process.exitCode = 0
  } catch (error) {
    fastify.log.error({ err: error }, "API shutdown failed")
    process.exitCode = 1
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))
