CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "CommunityPost_title_trgm_idx"
  ON "CommunityPost" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "CommunityPost_answerText_trgm_idx"
  ON "CommunityPost" USING GIN ("answerText" gin_trgm_ops);
