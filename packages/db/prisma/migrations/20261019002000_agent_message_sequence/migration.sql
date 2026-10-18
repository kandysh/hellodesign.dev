ALTER TABLE "AgentMessage" ADD COLUMN "sequence" INTEGER;

CREATE UNIQUE INDEX "AgentMessage_submissionId_sequence_key"
ON "AgentMessage"("submissionId", "sequence");
