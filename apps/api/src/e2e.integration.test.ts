import assert from "node:assert/strict"
import { type ChildProcess, spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { once } from "node:events"
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http"
import { createRequire } from "node:module"
import { createServer as createTcpServer } from "node:net"
import { dirname, resolve } from "node:path"
import { after, test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"
import { db } from "@sysdesign/db"
import type { AgentEvent } from "@sysdesign/shared"

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const canRunIntegration = Boolean(
  process.env.DATABASE_URL &&
    process.env.REDIS_URL &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.ENCRYPTION_KEY,
)

after(async () => {
  await db.$disconnect()
})

interface CapturedEmail {
  to?: string[]
  subject?: string
  text?: string
}

interface ChatRequest {
  model?: string
  stream?: boolean
  messages?: Array<{ content?: unknown }>
}

interface WebSocketClient {
  on(event: "message", listener: (data: Buffer | ArrayBuffer | Buffer[]) => void): this
  on(event: "error", listener: (error: Error) => void): this
  on(event: "close", listener: (code: number, reason: Buffer) => void): this
  close(): void
}

type WebSocketConstructor = new (
  url: string,
  options: { headers: Record<string, string> },
) => WebSocketClient

function delay(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString("utf8")
}

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" })
  response.end(JSON.stringify(value))
}

function createChatCompletion(request: ChatRequest, content: string) {
  return {
    id: `chatcmpl-${randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: request.model ?? "gpt-4o-mini",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
  }
}

function sendStreamingSatisfied(response: ServerResponse, modelName: string) {
  const chunk = (delta: Record<string, unknown>, finishReason: string | null) => ({
    id: "chatcmpl-integration",
    object: "chat.completion.chunk",
    created: 1,
    model: modelName,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  })
  response.write(`data: ${JSON.stringify(chunk({ role: "assistant" }, null))}\n\n`)
  response.write(
    `data: ${JSON.stringify(
      chunk(
        {
          tool_calls: [
            {
              index: 0,
              id: "call-mark-satisfied",
              type: "function",
              function: { name: "mark_satisfied", arguments: "{}" },
            },
          ],
        },
        null,
      ),
    )}\n\n`,
  )
  response.write(`data: ${JSON.stringify(chunk({}, "tool_calls"))}\n\n`)
  response.end("data: [DONE]\n\n")
}

async function listen(server: Server): Promise<number> {
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Could not determine the integration server port"))
        return
      }
      resolvePromise(address.port)
    })
  })
}

async function getAvailablePort(): Promise<number> {
  const server = createTcpServer()
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Could not reserve an API port"))
        return
      }
      const port = address.port
      server.close((error) => (error ? reject(error) : resolvePromise(port)))
    })
  })
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) return
  await new Promise<void>((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()))
  })
}

function captureOutput(child: ChildProcess) {
  let output = ""
  const capture = (chunk: Buffer) => {
    output = `${output}${chunk.toString("utf8")}`.slice(-12_000)
  }
  child.stdout?.on("data", capture)
  child.stderr?.on("data", capture)
  return () => output
}

function startService(entry: string, env: NodeJS.ProcessEnv) {
  const tsxCli = resolve(workspaceRoot, "apps/worker/node_modules/tsx/dist/cli.mjs")
  const child = spawn(process.execPath, [tsxCli, resolve(workspaceRoot, entry)], {
    cwd: workspaceRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  })
  return { child, output: captureOutput(child) }
}

async function waitForApi(child: ChildProcess, output: () => string, apiUrl: string) {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`API exited with code ${child.exitCode}:\n${output()}`)
    }
    try {
      const response = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return
    } catch {
      // The process may still be starting; retry until the startup deadline.
    }
    await delay(100)
  }
  throw new Error(`API did not become healthy in time:\n${output()}`)
}

async function waitForWorker(child: ChildProcess, output: () => string) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Worker exited with code ${child.exitCode}:\n${output()}`)
    }
    if (output().includes("workers_started")) return
    await delay(100)
  }
  throw new Error(`Worker did not announce startup in time:\n${output()}`)
}

async function stopService(child?: ChildProcess) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, "exit").catch(() => [])
  child.kill("SIGTERM")
  const stopped = await Promise.race([exited.then(() => true), delay(5000).then(() => false)])
  if (stopped) return
  child.kill("SIGKILL")
  await Promise.race([exited, delay(1000)])
}

function cookieValues(headers: Headers): string[] {
  const headersWithCookie = headers as Headers & { getSetCookie?: () => string[] }
  if (headersWithCookie.getSetCookie) return headersWithCookie.getSetCookie()
  const combined = headers.get("set-cookie")
  return combined ? combined.split(/,(?=\s*[^;,\s]+=)/) : []
}

function updateCookieJar(jar: Map<string, string>, headers: Headers) {
  for (const value of cookieValues(headers)) {
    const pair = value.split(";", 1)[0]?.trim()
    const separator = pair?.indexOf("=") ?? -1
    if (pair && separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1))
  }
}

function requireJsonContent(response: Response, body: unknown) {
  assert.ok(response.ok, `Request failed (${response.status}): ${JSON.stringify(body)}`)
}

test(
  "verified account can claim a guest key, complete a streamed evaluation, moderate a report, and delete its data",
  {
    skip:
      !canRunIntegration &&
      "Requires PostgreSQL, Redis, BETTER_AUTH_SECRET, and ENCRYPTION_KEY (configured in CI)",
    timeout: 90_000,
  },
  async () => {
    const question = await db.question.findFirst({
      where: { title: "Design a URL Shortener", isPublished: true },
      select: { id: true, rubric: true },
    })
    assert.ok(question, "Run the database seed before the end-to-end test")
    const rubric = question.rubric as { dimensions: Array<{ id: string }> }
    const dimensionIds = rubric.dimensions.map((dimension) => dimension.id)
    const verificationEmails: CapturedEmail[] = []

    const mockProvider = createHttpServer(async (request, response) => {
      const bodyText = await readBody(request)
      if (request.url?.startsWith("/api.resend.com/emails")) {
        verificationEmails.push(JSON.parse(bodyText) as CapturedEmail)
        sendJson(response, 200, { id: "email-integration-test" })
        return
      }

      if (request.url?.startsWith("/api.openai.com/")) {
        if (!request.headers.authorization?.startsWith("Bearer sk-hello-design-ci")) {
          sendJson(response, 401, { error: { message: "Mock provider received no test key" } })
          return
        }
        const chatRequest = JSON.parse(bodyText) as ChatRequest
        if (chatRequest.stream) {
          sendStreamingSatisfied(response, chatRequest.model ?? "gpt-4o-mini")
          return
        }

        const promptText = (chatRequest.messages ?? [])
          .map((message) =>
            typeof message.content === "string" ? message.content : JSON.stringify(message.content),
          )
          .join("\n")
        const content = promptText.includes('Return a JSON object with a "scores" array')
          ? JSON.stringify({
              scores: dimensionIds.map((dimensionId) => ({
                dimensionId,
                score: 80,
                reasoning: "The design explains a workable approach and its main trade-offs.",
                improvements: ["Describe behavior during a regional failure."],
              })),
            })
          : JSON.stringify({
              narrative:
                "The design has a clear architecture and explains the main data paths.\n\nIt also identifies useful trade-offs.\n\nThe next step is to make failure recovery more concrete.",
              improvements: [
                "Quantify recovery time and data loss during a regional failure.",
                "Explain how retries avoid duplicating writes.",
                "Add metrics for the busiest request path.",
              ],
            })
        sendJson(response, 200, createChatCompletion(chatRequest, content))
        return
      }

      sendJson(response, 404, { error: "Unmapped integration egress" })
    })

    const providerPort = await listen(mockProvider)
    const apiPort = await getAvailablePort()
    const apiUrl = `http://127.0.0.1:${apiPort}`
    const webOrigin = "http://localhost:3000"
    const mockEgressFile = resolve(workspaceRoot, "apps/api/test/mock-egress.mjs")
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(apiPort),
      BETTER_AUTH_URL: apiUrl,
      WEB_URL: webOrigin,
      RESEND_API_KEY: "re_test_only",
      AUTH_EMAIL_FROM: "Hello Design <test@example.test>",
      TRUST_PROXY_HOPS: "0",
      DEEP_EVAL_CONCURRENCY: "2",
      TEST_PROVIDER_URL: `http://127.0.0.1:${providerPort}/`,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--import=${pathToFileURL(mockEgressFile).href}`]
        .filter(Boolean)
        .join(" "),
    }

    let apiProcess: ChildProcess | undefined
    let workerProcess: ChildProcess | undefined
    let apiOutput = () => ""
    let workerOutput = () => ""
    const cookieJar = new Map<string, string>()
    let email: string | undefined
    let submissionId: string | undefined
    let postId: string | undefined
    let socket: WebSocketClient | undefined

    const apiRequest = async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      headers.set("Origin", webOrigin)
      if (cookieJar.size) {
        headers.set("Cookie", [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; "))
      }
      const response = await fetch(`${apiUrl}${path}`, { ...init, headers })
      updateCookieJar(cookieJar, response.headers)
      return response
    }

    const jsonRequest = (method: string, body: unknown): RequestInit => ({
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    try {
      apiProcess = startService("apps/api/src/index.ts", childEnv).child
      apiOutput = captureOutput(apiProcess)
      await waitForApi(apiProcess, apiOutput, apiUrl)
      workerProcess = startService("apps/worker/src/index.ts", childEnv).child
      workerOutput = captureOutput(workerProcess)
      await waitForWorker(workerProcess, workerOutput)

      const questionsResponse = await apiRequest("/api/questions")
      const questions = (await questionsResponse.json()) as Array<{ id: string; title: string }>
      assert.ok(questionsResponse.ok)
      assert.ok(questions.some((candidate) => candidate.id === question.id))
      assert.ok(cookieJar.has("session_id"), "Guest visit should establish a session cookie")

      const guestKeyResponse = await apiRequest(
        "/api/keys",
        jsonRequest("POST", {
          provider: "openai",
          key: "sk-hello-design-ci-1234",
          validate: false,
        }),
      )
      const guestKey = await guestKeyResponse.json()
      requireJsonContent(guestKeyResponse, guestKey)
      assert.ok(cookieJar.has("session_id"))

      email = `e2e-${randomUUID()}@example.test`
      const password = `Hello-Design-${randomUUID()}-Password!`
      const signUpResponse = await apiRequest(
        "/api/auth/sign-up/email",
        jsonRequest("POST", {
          name: "Launch Integration",
          email,
          password,
          callbackURL: webOrigin,
        }),
      )
      const signUpBody = await signUpResponse.json()
      requireJsonContent(signUpResponse, signUpBody)

      const verificationEmail = await waitForValue(
        () => verificationEmails.find((message) => message.to?.includes(email as string)),
        (message): message is CapturedEmail => Boolean(message?.text),
        10_000,
        "verification email",
      )
      const verificationUrl = verificationEmail.text?.match(/https?:\/\/[^\s<>"]+/)?.[0]
      assert.ok(verificationUrl, "Verification email should contain a link")
      const verificationResponse = await fetch(verificationUrl, { redirect: "manual" })
      updateCookieJar(cookieJar, verificationResponse.headers)
      assert.ok(
        verificationResponse.ok ||
          (verificationResponse.status >= 300 && verificationResponse.status < 400),
        `Email verification failed (${verificationResponse.status})`,
      )
      assert.equal(
        (await db.user.findUnique({ where: { email }, select: { emailVerified: true } }))
          ?.emailVerified,
        true,
      )

      await db.user.update({ where: { email }, data: { isAdmin: true } })
      const signInResponse = await apiRequest(
        "/api/auth/sign-in/email",
        jsonRequest("POST", { email, password, callbackURL: webOrigin }),
      )
      const signInBody = await signInResponse.json()
      requireJsonContent(signInResponse, signInBody)

      const claimResponse = await apiRequest("/api/me/claim-session", jsonRequest("POST", {}))
      const claimBody = (await claimResponse.json()) as { submissions: number; keys: number }
      requireJsonContent(claimResponse, claimBody)
      assert.equal(claimBody.keys, 1)
      const accountKeysResponse = await apiRequest("/api/keys")
      const accountKeys = (await accountKeysResponse.json()) as Array<{ keyHint: string }>
      assert.equal(accountKeys.length, 1)
      assert.equal(accountKeys[0]?.keyHint, "1234")

      const submissionResponse = await apiRequest(
        "/api/submissions",
        jsonRequest("POST", {
          questionId: question.id,
          answerText:
            "Use stateless API servers, a durable relational store, a cache for hot redirects, and a queue for analytics. Replicate the database and monitor cache misses and redirect latency.",
          agentType: "quick",
          modelName: "gpt-4o-mini",
        }),
      )
      const submissionBody = (await submissionResponse.json()) as { submissionId?: string }
      requireJsonContent(submissionResponse, submissionBody)
      assert.ok(submissionBody.submissionId)
      submissionId = submissionBody.submissionId

      const apiRequire = createRequire(resolve(workspaceRoot, "apps/api/package.json"))
      const websocketPluginEntry = apiRequire.resolve("@fastify/websocket")
      const websocketRequire = createRequire(websocketPluginEntry)
      const WebSocket = websocketRequire("ws") as WebSocketConstructor
      const wsUrl = `ws://127.0.0.1:${apiPort}/api/submissions/${submissionId}/ws`
      socket = new WebSocket(wsUrl, {
        headers: {
          Origin: webOrigin,
          Cookie: [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; "),
        },
      })
      const events: AgentEvent[] = []
      const streamDone = new Promise<void>((resolvePromise, reject) => {
        let settled = false
        const timeout = setTimeout(
          () => finish(new Error("Timed out waiting for eval_done")),
          45_000,
        )
        const finish = (error?: Error) => {
          if (settled) return
          settled = true
          clearTimeout(timeout)
          socket?.close()
          if (error) reject(error)
          else resolvePromise()
        }
        socket?.on("message", (data) => {
          const text = Buffer.isBuffer(data)
            ? data.toString("utf8")
            : data instanceof ArrayBuffer
              ? Buffer.from(data).toString("utf8")
              : Buffer.concat(data).toString("utf8")
          const event = JSON.parse(text) as AgentEvent
          events.push(event)
          if (event.type === "error")
            finish(new Error(`Evaluation stream failed: ${event.message}`))
          if (event.type === "eval_done") finish()
        })
        socket?.on("error", (error) => finish(error))
        socket?.on("close", (code, reason) => {
          if (!settled) finish(new Error(`WebSocket closed early (${code}): ${reason.toString()}`))
        })
      })
      await streamDone
      assert.ok(events.some((event) => event.type === "agent_flow"))
      assert.ok(events.some((event) => event.type === "eval_start"))
      assert.ok(events.some((event) => event.type === "eval_done"))

      const completedResponse = await apiRequest(`/api/submissions/${submissionId}`)
      const completed = (await completedResponse.json()) as {
        status: string
        result?: { overallScore: number; modelName: string }
      }
      requireJsonContent(completedResponse, completed)
      assert.equal(completed.status, "DONE")
      assert.equal(completed.result?.overallScore, 80)
      assert.equal(completed.result?.modelName, "gpt-4o-mini")

      const shareResponse = await apiRequest(
        "/api/community",
        jsonRequest("POST", { submissionId, title: "E2E URL Shortener", includeEvaluation: true }),
      )
      const shareBody = (await shareResponse.json()) as { id?: string }
      requireJsonContent(shareResponse, shareBody)
      assert.ok(shareBody.id)
      postId = shareBody.id

      const commentResponse = await apiRequest(
        `/api/community/${postId}/comments`,
        jsonRequest("POST", { content: "The evaluation flow completed." }),
      )
      const commentBody = (await commentResponse.json()) as { id?: string }
      requireJsonContent(commentResponse, commentBody)
      assert.ok(commentBody.id)

      const reportResponse = await apiRequest(
        `/api/community/${postId}/reports`,
        jsonRequest("POST", { reason: "Integration moderation check" }),
      )
      const reportBody = (await reportResponse.json()) as { id?: string }
      requireJsonContent(reportResponse, reportBody)
      assert.ok(reportBody.id)

      const reportsResponse = await apiRequest("/api/admin/community/reports")
      const reports = (await reportsResponse.json()) as Array<{ id: string; status: string }>
      requireJsonContent(reportsResponse, reports)
      assert.ok(reports.some((report) => report.id === reportBody.id && report.status === "OPEN"))

      const moderationResponse = await apiRequest(
        `/api/admin/community/reports/${reportBody.id}`,
        jsonRequest("PATCH", { action: "hide" }),
      )
      const moderation = (await moderationResponse.json()) as { status?: string }
      requireJsonContent(moderationResponse, moderation)
      assert.equal(moderation.status, "ACTIONED")
      assert.equal(
        (await db.communityPost.findUnique({ where: { id: postId }, select: { isHidden: true } }))
          ?.isHidden,
        true,
      )

      const deleteResponse = await apiRequest(
        "/api/me",
        jsonRequest("DELETE", { confirmEmail: email }),
      )
      const deleteBody = await deleteResponse.json()
      requireJsonContent(deleteResponse, deleteBody)
      assert.equal(await db.user.findUnique({ where: { email } }), null)
      assert.equal(await db.submission.findUnique({ where: { id: submissionId } }), null)
      assert.equal(await db.communityPost.findUnique({ where: { id: postId } }), null)
    } finally {
      socket?.close()
      await stopService(workerProcess)
      await stopService(apiProcess)
      if (email) await db.user.deleteMany({ where: { email } }).catch(() => {})
      await closeServer(mockProvider)
    }
  },
)

async function waitForValue<T, Ready extends T>(
  read: () => T | Promise<T>,
  isReady: (value: T) => value is Ready,
  timeoutMs: number,
  label: string,
): Promise<Ready> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await read()
    if (isReady(value)) return value
    await delay(50)
  }
  throw new Error(`Timed out waiting for ${label}`)
}
