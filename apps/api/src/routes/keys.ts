import { Hono } from "hono"
import { db, encryptKey, decryptKey } from "@sysdesign/db"
import { validateMistralKey } from "@sysdesign/ai"
import type { AppEnv } from "../lib/types.js"

const app = new Hono<AppEnv>()

// POST /api/keys — save (and optionally validate) a provider API key
app.post("/", async (c) => {
  const user = c.get("user")
  const sessionId = c.get("sessionId")

  const body = await c.req.json<{
    provider: string
    key: string
    validate?: boolean
  }>()

  if (!body.provider || !body.key) {
    return c.json({ error: "provider and key are required" }, 400)
  }

  if (body.provider !== "mistral") {
    return c.json({ error: "Only 'mistral' provider is currently supported" }, 400)
  }

  const keyTrimmed = body.key.trim()

  // Validate before storing if requested
  if (body.validate !== false) {
    const valid = await validateMistralKey(keyTrimmed)
    if (!valid) {
      return c.json({ error: "API key validation failed — check the key and try again" }, 422)
    }
  }

  const { encryptedKey, iv } = encryptKey(keyTrimmed)
  const keyHint = keyTrimmed.slice(-4)

  // Upsert: replace existing key for this user/session+provider combo
  const existing = await db.userApiKey.findFirst({
    where: user
      ? { userId: user.id, provider: body.provider }
      : { sessionId, provider: body.provider },
  })

  let record
  if (existing) {
    record = await db.userApiKey.update({
      where: { id: existing.id },
      data: {
        encryptedKey,
        iv,
        keyHint,
        validatedAt: body.validate !== false ? new Date() : null,
      },
    })
  } else {
    record = await db.userApiKey.create({
      data: {
        userId: user?.id ?? null,
        sessionId: user ? null : sessionId,
        provider: body.provider,
        encryptedKey,
        iv,
        keyHint,
        validatedAt: body.validate !== false ? new Date() : null,
      },
    })
  }

  return c.json(
    {
      id: record.id,
      provider: record.provider,
      keyHint: record.keyHint,
      validatedAt: record.validatedAt,
    },
    existing ? 200 : 201,
  )
})

// GET /api/keys — list keys for current user/session
app.get("/", async (c) => {
  const user = c.get("user")
  const sessionId = c.get("sessionId")

  const keys = await db.userApiKey.findMany({
    where: user ? { userId: user.id } : { sessionId },
    select: { id: true, provider: true, keyHint: true, validatedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return c.json(keys)
})

// DELETE /api/keys/:id — remove a key
app.delete("/:id", async (c) => {
  const user = c.get("user")
  const sessionId = c.get("sessionId")
  const id = c.req.param("id")

  const record = await db.userApiKey.findUnique({ where: { id } })
  if (!record) return c.json({ error: "Not found" }, 404)

  const isOwner =
    (user && record.userId === user.id) || (!user && record.sessionId === sessionId)
  if (!isOwner) return c.json({ error: "Forbidden" }, 403)

  await db.userApiKey.delete({ where: { id } })

  return c.json({ ok: true })
})

export default app
