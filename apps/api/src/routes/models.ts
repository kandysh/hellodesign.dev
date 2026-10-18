import { db, decryptKey } from "@sysdesign/db"
import type { FastifyPluginAsync } from "fastify"
import { redis } from "../lib/redis.js"

const CACHE_KEY = "openrouter:models"
const TTL_SECONDS = 60 * 60 * 24 * 2 // 2 days
const MODEL_LIMIT = 20

const SORTS = new Set([
  "intelligence-high-to-low",
  "coding-high-to-low",
  "agentic-high-to-low",
  "design-arena-elo-high-to-low",
  "most-popular",
])

interface OpenRouterModel {
  id: string
  name: string
  context_length?: number
  pricing?: { prompt?: string; completion?: string }
}

const modelsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { sort?: string } }>("/", async (req, reply) => {
    const sort =
      req.query.sort && SORTS.has(req.query.sort) ? req.query.sort : "intelligence-high-to-low"
    const cacheKey = sort ? `${CACHE_KEY}:${sort}` : CACHE_KEY
    const cached = await redis.get(cacheKey)
    if (cached) {
      reply.header("X-Cache", "HIT")
      return reply.send(JSON.parse(cached))
    }

    const keyRecord = await db.userApiKey.findFirst({
      where: req.user
        ? { userId: req.user.id, provider: "openai" }
        : { sessionId: req.sessionId, provider: "openai" },
      orderBy: { createdAt: "desc" },
    })
    const openRouterKey =
      keyRecord?.baseUrl && new URL(keyRecord.baseUrl).hostname === "openrouter.ai"
        ? decryptKey(keyRecord.encryptedKey, keyRecord.iv)
        : null
    if (!openRouterKey) {
      return reply.status(401).send({
        error:
          "Add an OpenRouter key in Settings to load its model catalog, or enter a model ID manually.",
      })
    }

    const url = new URL("https://openrouter.ai/api/v1/models")
    url.searchParams.set("sort", sort)
    url.searchParams.set("limit", String(MODEL_LIMIT))
    const res = await fetch(url, { headers: { Authorization: `Bearer ${openRouterKey}` } })
    if (!res.ok) {
      return reply.status(502).send({ error: "Failed to fetch models from OpenRouter" })
    }

    const json = (await res.json()) as { data: OpenRouterModel[] }
    const models: OpenRouterModel[] = json.data.map(({ id, name, context_length, pricing }) => ({
      id,
      name,
      context_length,
      pricing,
    }))
    await redis.set(cacheKey, JSON.stringify(models), "EX", TTL_SECONDS)

    reply.header("X-Cache", "MISS")
    return reply.send(models)
  })
}

export default modelsPlugin
