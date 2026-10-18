export function ownsSubmission(
  submission: { userId: string | null; sessionId: string | null },
  owner: { userId?: string; sessionId: string },
): boolean {
  if (owner.userId) return submission.userId === owner.userId
  return submission.userId === null && submission.sessionId === owner.sessionId
}
