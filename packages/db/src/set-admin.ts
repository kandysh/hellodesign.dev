import { db } from "./index.js"

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error("Usage: pnpm --filter @sysdesign/db admin:set -- user@example.com")
  process.exitCode = 1
} else {
  try {
    const user = await (db.user as any).update({ where: { email }, data: { isAdmin: true } })
    console.log(`Admin role granted to ${user.email}`)
  } catch (error) {
    console.error(`Could not grant admin role: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  } finally {
    await db.$disconnect()
  }
}
