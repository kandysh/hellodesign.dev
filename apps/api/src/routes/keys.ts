import { validateOpenAIKey } from "@sysdesign/ai"
import { db, encryptKey } from "@sysdesign/db"
import { getDefaultModelName, normalizeOpenAICompatibleBaseUrl } from "@sysdesign/shared"
import type { FastifyPluginAsync } from "fastify"
import { apiKeyOwnerWhere, ownsApiKey } from "../lib/key-access.js"
import { saveKeyBodySchema } from "../lib/request-schemas.js"

interface SaveKeyBody {
  provider: string
  key: string
  baseUrl?: string
  modelName?: string
  validate?: boolean
}

const keysPlugin: FastifyPluginAsync = async (fastify) => {
  // POST / — save (and optionally validate) a provider API key
  fastify.post<{ Body: SaveKeyBody }>(
    "/",
    { schema: { body: saveKeyBodySchema } },
    async (req, reply) => {
      const user = req.user
      const sessionId = req.sessionId

      const body = req.body

      if (typeof body?.provider !== "string" || typeof body.key !== "string" || !body.key.trim()) {
        return reply.code(400).send({ error: "provider and key are required" })
      }

      if (body.provider !== "openai") {
        return reply
          .code(400)
          .send({ error: "Use the 'openai' provider for OpenAI-compatible API keys" })
      }

      const keyTrimmed = body.key.trim()
      if (keyTrimmed.length > 512) {
        return reply.code(400).send({ error: "API key is too long" })
      }
      if (body.baseUrl !== undefined && typeof body.baseUrl !== "string") {
        return reply.code(400).send({ error: "baseUrl must be a URL string" })
      }
      const rawBaseUrl = body.baseUrl?.trim()
      let baseUrl: string | null = null
      if (rawBaseUrl) {
        if (rawBaseUrl.length > 2048) {
          return reply.code(400).send({ error: "API base URL is too long" })
        }
        try {
          baseUrl = normalizeOpenAICompatibleBaseUrl(rawBaseUrl, {
            allowLocalhost: process.env.NODE_ENV === "development",
          })
        } catch (error) {
          return reply
            .code(400)
            .send({ error: error instanceof Error ? error.message : "API base URL is invalid" })
        }
      }

      if (body.validate !== false) {
        const modelName = body.modelName?.trim() || getDefaultModelName(baseUrl)
        const valid = await validateOpenAIKey(keyTrimmed, baseUrl ?? undefined, modelName)
        if (!valid) {
          return reply
            .code(422)
            .send({ error: "API key validation failed — check the key and try again" })
        }
      }

      const { encryptedKey, iv } = encryptKey(keyTrimmed)
      const keyHint = keyTrimmed.slice(-4)

      const existing = await db.userApiKey.findFirst({
        where: { ...apiKeyOwnerWhere({ userId: user?.id, sessionId }), provider: body.provider },
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

      return reply.code(existing ? 200 : 201).send({
        id: record.id,
        provider: record.provider,
        keyHint: record.keyHint,
        baseUrl: record.baseUrl,
        validatedAt: record.validatedAt,
      })
    },
  )

  // GET / — list keys for current user/session
  fastify.get("/", async (req) => {
    const user = req.user
    const sessionId = req.sessionId

    const keys = await db.userApiKey.findMany({
      where: apiKeyOwnerWhere({ userId: user?.id, sessionId }),
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

    if (!ownsApiKey(record, { userId: user?.id, sessionId })) {
      return reply.code(403).send({ error: "Forbidden" })
    }

    await db.userApiKey.delete({ where: { id } })

    return { ok: true }
  })
}

export default keysPlugin
