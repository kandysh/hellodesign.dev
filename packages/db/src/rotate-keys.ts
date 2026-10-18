import "dotenv/config"
import { reencryptKey } from "./crypto.js"
import { db } from "./index.js"
import { getCurrentEncryptionKeyVersion } from "./security.js"

async function rotateKeys() {
  const currentVersion = getCurrentEncryptionKeyVersion()
  const records = await db.userApiKey.findMany({
    select: { id: true, encryptedKey: true, iv: true },
  })
  let rotatedCount = 0

  for (const record of records) {
    const rotated = reencryptKey(record.encryptedKey, record.iv)
    if (!rotated) continue
    await db.userApiKey.update({ where: { id: record.id }, data: rotated })
    rotatedCount += 1
  }

  console.log(`Re-encrypted ${rotatedCount} provider key(s) with ${currentVersion}.`)
  await db.$disconnect()
}

rotateKeys().catch(async (error) => {
  console.error("Provider key rotation failed.", error instanceof Error ? error.message : error)
  await db.$disconnect().catch(() => {})
  process.exitCode = 1
})
