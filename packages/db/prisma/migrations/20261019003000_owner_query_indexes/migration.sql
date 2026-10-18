CREATE INDEX "UserApiKey_userId_idx" ON "UserApiKey"("userId");
CREATE INDEX "UserApiKey_sessionId_idx" ON "UserApiKey"("sessionId");
CREATE INDEX "Submission_userId_createdAt_idx" ON "Submission"("userId", "createdAt");
CREATE INDEX "Submission_sessionId_createdAt_idx" ON "Submission"("sessionId", "createdAt");
