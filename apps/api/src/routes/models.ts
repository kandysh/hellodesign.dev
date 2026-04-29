import type { FastifyPluginAsync } from "fastify"
import { redis } from "../lib/redis.js"

const CACHE_KEY = "openrouter:models"
const TTL_SECONDS = 60 * 60 * 24 * 2 // 2 days

interface OpenRouterModel {
  id: string
  name: string
}

const modelsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (_req, reply) => {
    const cached = await redis.get(CACHE_KEY)
    if (cached) {
      reply.header("X-Cache", "HIT")
      return reply.send(JSON.parse(cached))
    }

    const res = await fetch("https://openrouter.ai/api/v1/models")
    if (!res.ok) {
      return reply.status(502).send({ error: "Failed to fetch models from OpenRouter" })
    }

    const json = await res.json() as { data: OpenRouterModel[] }
    const models: OpenRouterModel[] = json.data
      .map(({ id, name }) => ({ id, name }))
      .sort((a, b) => a.id.localeCompare(b.id))

    await redis.set(CACHE_KEY, JSON.stringify(models), "EX", TTL_SECONDS)

    reply.header("X-Cache", "MISS")
    return reply.send(models)
  })
}

export default modelsPlugin
