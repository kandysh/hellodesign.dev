import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { getCookie, setCookie } from "hono/cookie"
import { randomUUID } from "node:crypto"
import { auth } from "@sysdesign/auth"
import questionsRouter from "./routes/questions.js"
import submissionsRouter from "./routes/submissions.js"
import keysRouter from "./routes/keys.js"
import meRouter from "./routes/me.js"

const app = new Hono()

app.use("*", logger())
app.use(
  "*",
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  }),
)

// Attach better-auth session user to context
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (session?.user) {
    c.set("user" as never, session.user)
  }
  await next()
})

// Anonymous session cookie — set on every request for non-authenticated users
app.use("*", async (c, next) => {
  let sessionId = getCookie(c, "session_id")
  if (!sessionId) {
    sessionId = randomUUID()
    setCookie(c, "session_id", sessionId, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      secure: process.env.NODE_ENV === "production",
    })
  }
  c.set("sessionId" as never, sessionId)
  await next()
})

// Better Auth handler
app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw))

// API routes
app.route("/api/questions", questionsRouter)
app.route("/api/submissions", submissionsRouter)
app.route("/api/keys", keysRouter)
app.route("/api/me", meRouter)

app.get("/health", (c) => c.json({ ok: true }))

const port = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 API running at http://localhost:${info.port}`)
})
