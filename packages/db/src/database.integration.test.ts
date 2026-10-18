import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, test } from "node:test"
import { db } from "./index.js"

const databaseUrl = process.env.DATABASE_URL

after(async () => {
  await db.$disconnect()
})

test(
  "migrated database contains the launch question set with reference solutions",
  { skip: !databaseUrl && "Set DATABASE_URL to run PostgreSQL integration tests" },
  async () => {
    await db.$connect()
    const questions = await db.question.findMany({
      where: { isPublished: true },
      select: { title: true, referenceSolution: true },
    })

    assert.ok(
      questions.length >= 25,
      `Expected at least 25 published questions, got ${questions.length}`,
    )
    assert.ok(questions.every((question) => question.referenceSolution?.trim()))
  },
)

test(
  "deleting an account cascades through its auth, key, evaluation, and community data",
  { skip: !databaseUrl && "Set DATABASE_URL to run PostgreSQL integration tests" },
  async () => {
    await db.$connect()
    const question = await db.question.findFirst({
      where: { isPublished: true },
      select: { id: true },
    })
    assert.ok(question, "Seed questions before running account deletion checks")

    const userId = `integration-${randomUUID()}`
    let submissionId: string | undefined
    let postId: string | undefined
    let commentId: string | undefined

    try {
      const user = await db.user.create({
        data: {
          id: userId,
          email: `${userId}@example.test`,
          name: "Integration User",
          accounts: {
            create: {
              accountId: userId,
              providerId: "credential",
              password: "test-only-hash",
            },
          },
          sessions: {
            create: {
              token: randomUUID(),
              expiresAt: new Date(Date.now() + 60_000),
            },
          },
        },
      })

      await db.userApiKey.create({
        data: {
          userId: user.id,
          provider: "openai",
          encryptedKey: "test-ciphertext",
          iv: "test-iv",
          keyHint: "test",
        },
      })

      const submission = await db.submission.create({
        data: {
          questionId: question.id,
          userId: user.id,
          lexicalState: { root: { children: [] } },
          status: "DONE",
        },
      })
      submissionId = submission.id

      await db.evalResult.create({
        data: {
          submissionId,
          modelName: "integration-test-model",
          overallScore: 80,
          componentScores: {},
          feedback: "Integration test result",
          improvements: [],
        },
      })
      await db.agentMessage.create({
        data: {
          submissionId,
          sequence: 0,
          role: "USER",
          content: "Integration test answer",
        },
      })

      const post = await db.communityPost.create({
        data: {
          submissionId,
          authorId: user.id,
          questionId: question.id,
          title: "Integration test post",
          answerText: "Integration test answer",
        },
      })
      postId = post.id

      const comment = await db.communityComment.create({
        data: { postId, authorId: user.id, content: "Integration test comment" },
      })
      commentId = comment.id

      await db.communityPostVote.create({ data: { userId: user.id, postId } })
      await db.communityCommentVote.create({ data: { userId: user.id, commentId } })
      await db.communityReport.create({
        data: { reporterId: user.id, postId, reason: "OTHER" },
      })

      await db.user.delete({ where: { id: user.id } })

      const [
        account,
        session,
        apiKey,
        submissionRow,
        result,
        message,
        postRow,
        commentRow,
        report,
        postVote,
        commentVote,
      ] = await Promise.all([
        db.account.findFirst({ where: { userId: user.id } }),
        db.session.findFirst({ where: { userId: user.id } }),
        db.userApiKey.findFirst({ where: { userId: user.id } }),
        db.submission.findUnique({ where: { id: submission.id } }),
        db.evalResult.findUnique({ where: { submissionId } }),
        db.agentMessage.findFirst({ where: { submissionId } }),
        db.communityPost.findUnique({ where: { id: post.id } }),
        db.communityComment.findUnique({ where: { id: comment.id } }),
        db.communityReport.findFirst({ where: { postId } }),
        db.communityPostVote.findUnique({ where: { userId_postId: { userId: user.id, postId } } }),
        db.communityCommentVote.findUnique({
          where: { userId_commentId: { userId: user.id, commentId } },
        }),
      ])

      assert.deepEqual(
        [
          account,
          session,
          apiKey,
          submissionRow,
          result,
          message,
          postRow,
          commentRow,
          report,
          postVote,
          commentVote,
        ],
        Array(11).fill(null),
      )
    } finally {
      await db.user.deleteMany({ where: { id: userId } })
    }
  },
)
