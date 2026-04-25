import { sql } from "drizzle-orm"
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

// ─── Enums ───────────────────────────────────────────────────────────────────

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"])

export const categoryEnum = pgEnum("category", [
  "distributed-systems",
  "databases",
  "caching",
  "messaging",
  "api-design",
  "storage",
  "networking",
  "general",
])

export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "evaluating",
  "done",
  "failed",
])

export const evaluationStatusEnum = pgEnum("evaluation_status", [
  "pending",
  "running",
  "done",
  "failed",
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
})

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
})

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
})

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: difficultyEnum("difficulty").notNull().default("medium"),
  category: categoryEnum("category").notNull().default("general"),
  rubricHints: text("rubric_hints").array().notNull().default(sql`'{}'`),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
})

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id),
  answerText: text("answer_text").notNull(),
  excalidrawJson: jsonb("excalidraw_json"),
  status: submissionStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
})

export const evaluations = pgTable("evaluations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: uuid("submission_id")
    .notNull()
    .unique()
    .references(() => submissions.id, { onDelete: "cascade" }),
  overallScore: real("overall_score"),
  orchestratorResult: jsonb("orchestrator_result"),
  status: evaluationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
})

export const agentResults = pgTable("agent_results", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  evaluationId: uuid("evaluation_id")
    .notNull()
    .references(() => evaluations.id, { onDelete: "cascade" }),
  agentName: text("agent_name").notNull(),
  score: real("score").notNull(),
  strengths: text("strengths").array().notNull().default(sql`'{}'`),
  weaknesses: text("weaknesses").array().notNull().default(sql`'{}'`),
  suggestions: text("suggestions").array().notNull().default(sql`'{}'`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
})
