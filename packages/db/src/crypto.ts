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
  const iv = randomBytes(16)
  const cipher = createCipheriv("aes-256-cbc", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return {
    encryptedKey: encrypted.toString("hex"),
    iv: iv.toString("hex"),
  }
}

export function decryptKey(encryptedKey: string, iv: string): string {
  const key = getEncryptionKey()
  const decipher = createDecipheriv("aes-256-cbc", key, Buffer.from(iv, "hex"))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedKey, "hex")),
    decipher.final(),
  ])
  return decrypted.toString("utf8")
}
