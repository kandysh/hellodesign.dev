import type { FastifyPluginAsync } from "fastify"
import { db } from "@sysdesign/db"

const adminPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Sign in required" })
    if (!req.user.isAdmin) return reply.code(403).send({ error: "Admin role required" })
  })

  fastify.get("/community/reports", async () => (db as any).communityReport.findMany({
    where: { status: "OPEN" }, orderBy: { createdAt: "asc" },
    include: { reporter: { select: { name: true, email: true } }, post: { select: { id: true, title: true, isHidden: true } }, comment: { select: { id: true, content: true, isHidden: true, postId: true } } },
  }))

  fastify.patch<{ Params: { reportId: string } }>("/community/reports/:reportId", async (req, reply) => {
    const body = req.body as { action?: "dismiss" | "hide" }
    if (!["dismiss", "hide"].includes(body?.action ?? "")) return reply.code(400).send({ error: "Action must be dismiss or hide" })
    const report = await (db as any).communityReport.findUnique({ where: { id: req.params.reportId } })
    if (!report) return reply.code(404).send({ error: "Report not found" })
    const action = body.action!
    if (action === "dismiss") return (db as any).communityReport.update({ where: { id: report.id }, data: { status: "DISMISSED", resolvedById: req.user!.id, resolvedAt: new Date() } })
    if (report.commentId) await (db as any).communityComment.update({ where: { id: report.commentId }, data: { isHidden: true } })
    if (report.postId) await (db as any).communityPost.update({ where: { id: report.postId }, data: { isHidden: true } })
    return (db as any).communityReport.update({ where: { id: report.id }, data: { status: "ACTIONED", resolvedById: req.user!.id, resolvedAt: new Date() } })
  })
}

export default adminPlugin
