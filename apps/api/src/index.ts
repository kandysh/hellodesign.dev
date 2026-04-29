import "./env.js"
import "./lib/types.js"
import Fastify from "fastify"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import websocket from "@fastify/websocket"
import { randomUUID } from "node:crypto"
import { Readable } from "node:stream"
import { auth } from "@sysdesign/auth"
import { fromNodeHeaders, toNodeHandler } from "better-auth/node"
import questionsRouter from "./routes/questions.js"
import submissionsRouter from "./routes/submissions.js"
import keysRouter from "./routes/keys.js"
import meRouter from "./routes/me.js"
import modelsRouter from "./routes/models.js"

const fastify = Fastify({ logger: { level: "info" } })

await fastify.register(cors, {
  origin: process.env.WEB_URL ?? "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
})

await fastify.register(cookie)
await fastify.register(websocket)

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

// /api/auth/* handled in preParsing hook above
fastify.all("/api/auth/*", async (_req, _reply) => {})

fastify.register(questionsRouter, { prefix: "/api/questions" })
fastify.register(submissionsRouter, { prefix: "/api/submissions" })
fastify.register(keysRouter, { prefix: "/api/keys" })
fastify.register(meRouter, { prefix: "/api/me" })
fastify.register(modelsRouter, { prefix: "/api/models" })

fastify.get("/health", async () => ({ ok: true }))

const port = Number(process.env.PORT ?? 3001)
await fastify.listen({ port, host: "0.0.0.0" })
