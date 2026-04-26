import "./env.js"
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

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
    sessionId: string
  }
}>()

app.use("*", logger())

// CORS — must be registered before routes per better-auth docs
app.use(
  "/api/auth/*",
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
)

app.use(
  "*",
  cors({
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS", "DELETE", "PUT", "PATCH"],
    credentials: true,
  }),
)

// Session middleware — official better-auth/hono pattern
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    c.set("user", null)
    c.set("session", null)
    await next()
    return
  }
  c.set("user", session.user)
  c.set("session", session.session)
  await next()
})

// Anonymous session cookie — tracks unauthenticated users for submission history.
// Excluded from /api/auth/* to avoid any header-merge side effects.
app.use("/api/*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth/")) {
    await next()
    return
  }
  let sessionId = getCookie(c, "session_id")
  if (!sessionId) {
    sessionId = randomUUID()
    setCookie(c, "session_id", sessionId, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    })
  }
  c.set("sessionId", sessionId)
  await next()
})

// Better Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))

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
