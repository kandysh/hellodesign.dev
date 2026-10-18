import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

function getEncryptionKey(): Buffer {
  // Derive a consistent 32-byte key from the encryption secret
  const secret =
    process.env.ENCRYPTION_KEY ??
    process.env.BETTER_AUTH_SECRET ??
    "fallback-key-replace-in-production"
  return createHash("sha256").update(secret).digest()
}

export function encryptKey(plaintext: string): { encryptedKey: string; iv: string } {
  const key = getEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  // Store the authentication tag after the ciphertext to keep the existing schema.
  const encryptedWithTag = Buffer.concat([encrypted, cipher.getAuthTag()])
  return {
    encryptedKey: encryptedWithTag.toString("hex"),
    iv: iv.toString("hex"),
  }
}

export function decryptKey(encryptedKey: string, iv: string): string {
  const key = getEncryptionKey()
  const ivBuffer = Buffer.from(iv, "hex")
  const encryptedBuffer = Buffer.from(encryptedKey, "hex")

  // AES-GCM records use 12-byte IVs. Keep reading legacy AES-CBC records (16-byte IVs)
  // so existing user keys remain usable after deployment.
  if (ivBuffer.length === 12) {
    if (encryptedBuffer.length < 16) throw new Error("Invalid encrypted API key")
    const ciphertext = encryptedBuffer.subarray(0, -16)
    const authTag = encryptedBuffer.subarray(-16)
    const decipher = createDecipheriv("aes-256-gcm", key, ivBuffer)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString("utf8")
  }

  const decipher = createDecipheriv("aes-256-cbc", key, ivBuffer)
  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}
