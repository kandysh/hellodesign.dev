import { PrismaClient } from "@prisma/client"

export const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
})

export * from "./crypto.js"
export type { Prisma } from "@prisma/client"
export { PrismaClient } from "@prisma/client"
