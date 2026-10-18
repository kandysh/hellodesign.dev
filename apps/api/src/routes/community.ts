import { db } from "@sysdesign/db"
import { extractLexicalText } from "@sysdesign/shared"
import type { FastifyPluginAsync } from "fastify"

interface ShareBody {
  submissionId: string
  title?: string
  includeEvaluation?: boolean
}
interface EditPostBody {
  title?: string
  answerText?: string
}
interface CreateCommentBody {
  content: string
}
interface ReportBody {
  reason: string
  details?: string
  commentId?: string
}

const shareBodySchema = {
  type: "object",
  required: ["submissionId"],
  additionalProperties: false,
  properties: {
    submissionId: { type: "string", minLength: 1, maxLength: 100 },
    title: { type: "string", maxLength: 160 },
    includeEvaluation: { type: "boolean" },
  },
} as const

const editPostBodySchema = {
  type: "object",
  minProperties: 1,
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 160 },
    answerText: { type: "string", minLength: 1, maxLength: 50_000 },
  },
} as const

const createCommentBodySchema = {
  type: "object",
  required: ["content"],
  additionalProperties: false,
  properties: { content: { type: "string", minLength: 1, maxLength: 5000 } },
} as const

const reportBodySchema = {
  type: "object",
  required: ["reason"],
  additionalProperties: false,
  properties: {
    reason: { type: "string", minLength: 1, maxLength: 100 },
    details: { type: "string", maxLength: 2000 },
    commentId: { type: "string", maxLength: 100 },
  },
} as const

const communityPlugin: FastifyPluginAsync = async (fastify) => {
  const requireUser = (
    req: { user: { id: string; isAdmin?: boolean | null } | null },
    reply: { code: (n: number) => { send: (v: unknown) => unknown } },
  ) => {
    if (!req.user) {
      reply.code(401).send({ error: "Sign in required" })
      return null
    }
    return req.user
  }

  fastify.get("/", async (req, reply) => {
    const { q, category, difficulty, cursor } = req.query as Record<string, string | undefined>
    if (q && q.length > 120)
      return reply.code(400).send({ error: "Search text must be 120 characters or fewer" })
    if (difficulty && !["easy", "medium", "hard"].includes(difficulty.toLowerCase()))
      return reply.code(400).send({ error: "Difficulty must be easy, medium, or hard" })
    const rows = await db.communityPost.findMany({
      where: {
        isHidden: false,
        ...(category || difficulty
          ? {
              question: {
                ...(category ? { category } : {}),
                ...(difficulty
                  ? { difficulty: difficulty.toUpperCase() as "EASY" | "MEDIUM" | "HARD" }
                  : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { answerText: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      take: 30,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        question: { select: { title: true, category: true, difficulty: true } },
        _count: { select: { comments: true, votes: true } },
      },
    })
    const viewerId = req.user?.id
    const votes =
      viewerId && rows.length
        ? await db.communityPostVote.findMany({
            where: { userId: viewerId, postId: { in: rows.map((p) => p.id) } },
            select: { postId: true },
          })
        : []
    const voted = new Set(votes.map((v) => v.postId))
    return rows.map((p) => ({
      id: p.id,
      title: p.title,
      answerText: p.answerText,
      createdAt: p.createdAt,
      authorName: p.author.name ?? "Member",
      question: p.question,
      voteCount: p._count.votes,
      commentCount: p._count.comments,
      hasVoted: voted.has(p.id),
      evaluation: p.includeEvaluation ? p.evaluation : null,
    }))
  })

  fastify.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const p = await db.communityPost.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { name: true } },
        question: { select: { title: true, category: true, difficulty: true } },
        _count: { select: { votes: true } },
        comments: {
          where: { isHidden: false },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } }, _count: { select: { votes: true } } },
        },
      },
    })
    if (!p || (p.isHidden && !req.user?.isAdmin))
      return reply.code(404).send({ error: "Post not found" })
    const userId = req.user?.id
    const [postVote, commentVotes] = userId
      ? await Promise.all([
          db.communityPostVote.findUnique({ where: { userId_postId: { userId, postId: p.id } } }),
          db.communityCommentVote.findMany({
            where: { userId, commentId: { in: p.comments.map((c) => c.id) } },
            select: { commentId: true },
          }),
        ])
      : [null, []]
    const votedComments = new Set(commentVotes.map((v) => v.commentId))
    return {
      id: p.id,
      title: p.title,
      answerText: p.answerText,
      diagram: p.diagram,
      createdAt: p.createdAt,
      authorName: p.author.name ?? "Member",
      isAuthor: userId === p.authorId,
      question: p.question,
      voteCount: p._count.votes,
      hasVoted: !!postVote,
      evaluation: p.includeEvaluation ? p.evaluation : null,
      comments: p.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        authorName: comment.author.name ?? "Member",
        voteCount: comment._count.votes,
        hasVoted: votedComments.has(comment.id),
        canDelete: userId === comment.authorId,
      })),
    }
  })

  fastify.post<{ Body: ShareBody }>(
    "/",
    { schema: { body: shareBodySchema } },
    async (req, reply) => {
      const user = requireUser(req, reply)
      if (!user) return
      const body = req.body
      if (!body.submissionId) return reply.code(400).send({ error: "submissionId is required" })
      const submission = await db.submission.findUnique({
        where: { id: body.submissionId },
        include: { result: true, question: true },
      })
      if (!submission || submission.userId !== user.id)
        return reply.code(404).send({ error: "Completed submission not found" })
      if (submission.status !== "DONE" || !submission.result)
        return reply.code(409).send({ error: "Only completed submissions can be shared" })
      const answerText = extractLexicalText(
        submission.lexicalState as Record<string, unknown>,
      ).trim()
      if (!answerText)
        return reply.code(409).send({ error: "Submission has no answer text to share" })
      const existingPost = await db.communityPost.findUnique({
        where: { submissionId: submission.id },
        select: { id: true, authorId: true },
      })
      if (existingPost) {
        if (existingPost.authorId !== user.id)
          return reply.code(409).send({ error: "This submission was already shared" })
        return reply.send({ id: existingPost.id })
      }
      try {
        const post = await db.communityPost.create({
          data: {
            submissionId: submission.id,
            authorId: user.id,
            questionId: submission.questionId,
            title: body.title?.trim().slice(0, 160) || submission.question.title,
            answerText,
            diagram: submission.excalidrawData ?? undefined,
            includeEvaluation: body.includeEvaluation === true,
            evaluation:
              body.includeEvaluation === true
                ? {
                    overallScore: submission.result.overallScore,
                    componentScores: submission.result.componentScores,
                    feedback: submission.result.feedback,
                    improvements: submission.result.improvements,
                  }
                : undefined,
          },
        })
        return reply.code(201).send({ id: post.id })
      } catch (e) {
        if ((e as { code?: string }).code === "P2002")
          return reply.code(409).send({ error: "This submission is already shared" })
        throw e
      }
    },
  )

  fastify.patch<{ Params: { id: string }; Body: EditPostBody }>(
    "/:id",
    { schema: { body: editPostBodySchema } },
    async (req, reply) => {
      const user = requireUser(req, reply)
      if (!user) return
      const p = await db.communityPost.findUnique({ where: { id: req.params.id } })
      if (!p) return reply.code(404).send({ error: "Post not found" })
      if (p.authorId !== user.id) {
        return reply.code(403).send({
          error: user.isAdmin
            ? "Admins can hide or delete posts, but cannot edit author content"
            : "Forbidden",
        })
      }
      const body = req.body
      if (body.title !== undefined && (!body.title.trim() || body.title.length > 160))
        return reply.code(400).send({ error: "Title must be between 1 and 160 characters" })
      if (
        body.answerText !== undefined &&
        (!body.answerText.trim() || body.answerText.length > 50000)
      )
        return reply.code(400).send({ error: "Answer must be between 1 and 50000 characters" })
      return db.communityPost.update({
        where: { id: p.id },
        data: {
          ...(body.title !== undefined ? { title: body.title.trim() } : {}),
          ...(body.answerText !== undefined ? { answerText: body.answerText.trim() } : {}),
        },
      })
    },
  )

  fastify.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const p = await db.communityPost.findUnique({ where: { id: req.params.id } })
    if (!p) return reply.code(404).send({ error: "Post not found" })
    if (p.authorId !== user.id && !user.isAdmin) return reply.code(403).send({ error: "Forbidden" })
    await db.communityPost.delete({ where: { id: p.id } })
    return { ok: true }
  })

  fastify.post<{ Params: { id: string }; Body: CreateCommentBody }>(
    "/:id/comments",
    { schema: { body: createCommentBodySchema } },
    async (req, reply) => {
      const user = requireUser(req, reply)
      if (!user) return
      const post = await db.communityPost.findUnique({ where: { id: req.params.id } })
      if (!post || post.isHidden) return reply.code(404).send({ error: "Post not found" })
      const content = req.body.content.trim()
      if (!content || content.length > 5000)
        return reply.code(400).send({ error: "Comment must be between 1 and 5000 characters" })
      return reply.code(201).send(
        await db.communityComment.create({
          data: { postId: post.id, authorId: user.id, content },
          include: { author: { select: { name: true } } },
        }),
      )
    },
  )

  fastify.delete<{ Params: { id: string; commentId: string } }>(
    "/:id/comments/:commentId",
    async (req, reply) => {
      const user = requireUser(req, reply)
      if (!user) return
      const c = await db.communityComment.findUnique({ where: { id: req.params.commentId } })
      if (!c || c.postId !== req.params.id)
        return reply.code(404).send({ error: "Comment not found" })
      if (c.authorId !== user.id && !user.isAdmin)
        return reply.code(403).send({ error: "Forbidden" })
      await db.communityComment.delete({ where: { id: c.id } })
      return { ok: true }
    },
  )

  fastify.put<{ Params: { id: string } }>("/:id/vote", async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const postId = req.params.id
    if (
      !(await db.communityPost.findUnique({
        where: { id: postId, isHidden: false },
        select: { id: true },
      }))
    )
      return reply.code(404).send({ error: "Post not found" })
    await db.communityPostVote.upsert({
      where: { userId_postId: { userId: user.id, postId } },
      create: { userId: user.id, postId },
      update: {},
    })
    return { ok: true }
  })
  fastify.delete<{ Params: { id: string } }>("/:id/vote", async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    await db.communityPostVote.deleteMany({ where: { userId: user.id, postId: req.params.id } })
    return { ok: true }
  })
  fastify.put<{ Params: { id: string; commentId: string } }>(
    "/:id/comments/:commentId/vote",
    async (req, reply) => {
      const user = requireUser(req, reply)
      if (!user) return
      const c = await db.communityComment.findUnique({
        where: { id: req.params.commentId, isHidden: false },
      })
      if (!c || c.postId !== req.params.id)
        return reply.code(404).send({ error: "Comment not found" })
      await db.communityCommentVote.upsert({
        where: { userId_commentId: { userId: user.id, commentId: c.id } },
        create: { userId: user.id, commentId: c.id },
        update: {},
      })
      return { ok: true }
    },
  )
  fastify.delete<{ Params: { id: string; commentId: string } }>(
    "/:id/comments/:commentId/vote",
    async (req, reply) => {
      const user = requireUser(req, reply)
      if (!user) return
      await db.communityCommentVote.deleteMany({
        where: { userId: user.id, commentId: req.params.commentId },
      })
      return { ok: true }
    },
  )

  fastify.post<{ Params: { id: string }; Body: ReportBody }>(
    "/:id/reports",
    { schema: { body: reportBodySchema } },
    async (req, reply) => {
      const user = requireUser(req, reply)
      if (!user) return
      const body = req.body
      const reason = body.reason?.trim()
      if (!reason || reason.length > 100)
        return reply.code(400).send({ error: "A report reason is required" })
      const commentId = body.commentId
      if (commentId) {
        const c = await db.communityComment.findUnique({ where: { id: commentId } })
        if (!c || c.postId !== req.params.id)
          return reply.code(404).send({ error: "Comment not found" })
      } else if (!(await db.communityPost.findUnique({ where: { id: req.params.id } })))
        return reply.code(404).send({ error: "Post not found" })
      const existing = await db.communityReport.findFirst({
        where: {
          reporterId: user.id,
          postId: commentId ? null : req.params.id,
          commentId: commentId ?? null,
          status: "OPEN",
        },
      })
      if (existing) return reply.code(409).send({ error: "You already reported this content" })
      return reply.code(201).send(
        await db.communityReport.create({
          data: {
            reporterId: user.id,
            postId: commentId ? null : req.params.id,
            commentId: commentId ?? null,
            reason,
            details: body.details?.slice(0, 2000),
          },
        }),
      )
    },
  )
}

export default communityPlugin
