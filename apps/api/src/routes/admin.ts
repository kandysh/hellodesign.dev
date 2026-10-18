import { db } from "@sysdesign/db"
import type { FastifyPluginAsync } from "fastify"

const reportActionBodySchema = {
  type: "object",
  required: ["action"],
  additionalProperties: false,
  properties: { action: { type: "string", enum: ["dismiss", "hide"] } },
} as const

const adminPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Sign in required" })
    if (!req.user.isAdmin) return reply.code(403).send({ error: "Admin role required" })
  })

  fastify.get("/community/reports", async () =>
    db.communityReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: {
        reporter: { select: { name: true, email: true } },
        post: { select: { id: true, title: true, isHidden: true } },
        comment: { select: { id: true, content: true, isHidden: true, postId: true } },
      },
    }),
  )

  fastify.patch<{ Params: { reportId: string }; Body: { action: "dismiss" | "hide" } }>(
    "/community/reports/:reportId",
    { schema: { body: reportActionBodySchema } },
    async (req, reply) => {
      const body = req.body
      if (!["dismiss", "hide"].includes(body.action))
        return reply.code(400).send({ error: "Action must be dismiss or hide" })
      const report = await db.communityReport.findUnique({ where: { id: req.params.reportId } })
      if (!report) return reply.code(404).send({ error: "Report not found" })
      const action = body.action
      if (action === "dismiss")
        return db.communityReport.update({
          where: { id: report.id },
          data: { status: "DISMISSED", resolvedById: req.user?.id ?? null, resolvedAt: new Date() },
        })
      if (report.commentId)
        await db.communityComment.update({
          where: { id: report.commentId },
          data: { isHidden: true },
        })
      if (report.postId)
        await db.communityPost.update({ where: { id: report.postId }, data: { isHidden: true } })
      return db.communityReport.update({
        where: { id: report.id },
        data: { status: "ACTIONED", resolvedById: req.user?.id ?? null, resolvedAt: new Date() },
      })
    },
  )
}

export default adminPlugin
