import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"
import { getCurrentEncryptionKeyVersion, getEncryptionSecret } from "./security.js"

const LEGACY_FALLBACK_SECRET = "fallback-key-replace-in-production"

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest()
}

export function encryptKey(plaintext: string): { encryptedKey: string; iv: string } {
  const version = getCurrentEncryptionKeyVersion()
  const key = deriveKey(getEncryptionSecret(version))
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  // Store the authentication tag after the ciphertext to keep the existing schema.
  const encryptedWithTag = Buffer.concat([encrypted, cipher.getAuthTag()])
  return {
    encryptedKey: `${version}:${encryptedWithTag.toString("hex")}`,
    iv: iv.toString("hex"),
  }
}

export function decryptKey(encryptedKey: string, iv: string): string {
  const versionMatch = /^(v\d+):(.*)$/.exec(encryptedKey)
  if (versionMatch) {
    const version = versionMatch[1]
    const encryptedValue = versionMatch[2]
    if ((version !== "v1" && version !== "v2") || encryptedValue === undefined) {
      throw new Error(`Unsupported API key encryption version: ${version ?? "unknown"}`)
    }
    return decryptWithSecret(encryptedValue, iv, getEncryptionSecret(version))
  }

  // Unversioned rows predate the dedicated-key requirement. Try the former
  // key sources so deployments can migrate without losing stored provider keys.
  const legacySecrets = [
    process.env.ENCRYPTION_KEY,
    process.env.ENCRYPTION_KEY_V2,
    process.env.BETTER_AUTH_SECRET,
    "",
    LEGACY_FALLBACK_SECRET,
  ].filter((secret): secret is string => secret !== undefined)
  for (const secret of [...new Set(legacySecrets)]) {
    try {
      return decryptWithSecret(encryptedKey, iv, secret)
    } catch {
      // Continue through the legacy key candidates.
    }
  }
  throw new Error("Unable to decrypt stored API key with the configured or legacy keys")
}

export function reencryptKey(
  encryptedKey: string,
  iv: string,
): { encryptedKey: string; iv: string } | null {
  const version = getCurrentEncryptionKeyVersion()
  if (encryptedKey.startsWith(`${version}:`)) return null
  return encryptKey(decryptKey(encryptedKey, iv))
}

function decryptWithSecret(encryptedKey: string, iv: string, secret: string): string {
  const key = deriveKey(secret)
  const ivBuffer = Buffer.from(iv, "hex")
  const encryptedBuffer = Buffer.from(encryptedKey.replace(/^v1:/, ""), "hex")

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
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()])
  return decrypted.toString("utf8")
}
