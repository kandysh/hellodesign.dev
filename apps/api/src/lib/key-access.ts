export interface ApiKeyOwner {
  userId?: string
  sessionId: string
}

export function apiKeyOwnerWhere(owner: ApiKeyOwner): { userId: string } | { sessionId: string } {
  return owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId }
}

export function ownsApiKey(
  record: { userId: string | null; sessionId: string | null },
  owner: ApiKeyOwner,
): boolean {
  if (owner.userId) return record.userId === owner.userId
  return record.userId === null && record.sessionId === owner.sessionId
}
