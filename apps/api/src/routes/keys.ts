import type { FastifyPluginAsync } from "fastify"
import { db, encryptKey } from "@sysdesign/db"
import { validateOpenAIKey } from "@sysdesign/ai"

const keysPlugin: FastifyPluginAsync = async (fastify) => {
  // POST / — save (and optionally validate) a provider API key
  fastify.post("/", async (req, reply) => {
    const user = req.user
    const sessionId = req.sessionId

    const body = req.body as {
      provider: string
      key: string
      baseUrl?: string
      validate?: boolean
    }

    if (!body.provider || !body.key) {
      return reply.code(400).send({ error: "provider and key are required" })
    }

    if (body.provider !== "openai") {
      return reply.code(400).send({ error: "Only 'openai' provider is currently supported" })
    }

    const keyTrimmed = body.key.trim()
    const baseUrl = body.baseUrl?.trim() || null

    if (body.validate !== false) {
      const valid = await validateOpenAIKey(keyTrimmed, baseUrl ?? undefined)
      if (!valid) {
        return reply
          .code(422)
          .send({ error: "API key validation failed — check the key and try again" })
      }
    }

    const { encryptedKey, iv } = encryptKey(keyTrimmed)
    const keyHint = keyTrimmed.slice(-4)

    const existing = await db.userApiKey.findFirst({
      where: user
        ? { userId: user.id, provider: body.provider }
        : { sessionId, provider: body.provider },
    })

    const record = existing
      ? await db.userApiKey.update({
          where: { id: existing.id },
          data: {
            encryptedKey,
            iv,
            keyHint,
            baseUrl,
            validatedAt: body.validate !== false ? new Date() : null,
          },
        })
      : await db.userApiKey.create({
          data: {
            userId: user?.id ?? null,
            sessionId: user ? null : sessionId,
            provider: body.provider,
            encryptedKey,
            iv,
            keyHint,
            baseUrl,
            validatedAt: body.validate !== false ? new Date() : null,
          },
        })

    // Store encrypted key + IV + baseUrl in httpOnly cookie
    const cookieValue = JSON.stringify({ encryptedKey, iv, baseUrl })
    void reply.setCookie("api_key_openai", cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    })

    return reply.code(existing ? 200 : 201).send({
      id: record.id,
      provider: record.provider,
      keyHint: record.keyHint,
      baseUrl: record.baseUrl,
      validatedAt: record.validatedAt,
    })
  })

  // GET / — list keys for current user/session
  fastify.get("/", async (req) => {
    const user = req.user
    const sessionId = req.sessionId

    const keys = await db.userApiKey.findMany({
      where: user ? { userId: user.id } : { sessionId },
      select: {
        id: true,
        provider: true,
        keyHint: true,
        baseUrl: true,
        validatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return keys
  })

  // DELETE /:id — remove a key
  fastify.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const user = req.user
    const sessionId = req.sessionId
    const { id } = req.params

    const record = await db.userApiKey.findUnique({ where: { id } })
    if (!record) return reply.code(404).send({ error: "Not found" })

    const isOwner =
      (user && record.userId === user.id) || (!user && record.sessionId === sessionId)
    if (!isOwner) return reply.code(403).send({ error: "Forbidden" })

    await db.userApiKey.delete({ where: { id } })

    void reply.setCookie("api_key_openai", "", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    })

    return { ok: true }
  })
}

export default keysPlugin
