import assert from "node:assert/strict"
import { createCipheriv, createHash, randomBytes } from "node:crypto"
import test from "node:test"
import { decryptKey, encryptKey, reencryptKey } from "./crypto.js"
import { assertSecurityEnvironment } from "./security.js"

test("encrypts new API keys with the v1 version prefix", () => {
  const oldEncryptionKey = process.env.ENCRYPTION_KEY
  process.env.ENCRYPTION_KEY = "test-encryption-key-that-is-at-least-32-characters"
  try {
    const encrypted = encryptKey("sk-test-provider-key")
    assert.match(encrypted.encryptedKey, /^v1:/)
    assert.equal(decryptKey(encrypted.encryptedKey, encrypted.iv), "sk-test-provider-key")
  } finally {
    if (oldEncryptionKey === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = oldEncryptionKey
  }
})

test("decrypts legacy AES-CBC API key records", () => {
  const oldEncryptionKey = process.env.ENCRYPTION_KEY
  const legacyKey = "legacy-encryption-key-that-is-at-least-32-characters"
  process.env.ENCRYPTION_KEY = legacyKey
  try {
    const iv = randomBytes(16)
    const key = createHash("sha256").update(legacyKey).digest()
    const cipher = createCipheriv("aes-256-cbc", key, iv)
    const ciphertext = Buffer.concat([
      cipher.update("sk-legacy-provider-key", "utf8"),
      cipher.final(),
    ])
    assert.equal(
      decryptKey(ciphertext.toString("hex"), iv.toString("hex")),
      "sk-legacy-provider-key",
    )
  } finally {
    if (oldEncryptionKey === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = oldEncryptionKey
  }
})

test("supports an explicitly selected v2 encryption key during rotation", () => {
  const previousKey = process.env.ENCRYPTION_KEY
  const previousV2Key = process.env.ENCRYPTION_KEY_V2
  const previousVersion = process.env.ENCRYPTION_KEY_VERSION
  process.env.ENCRYPTION_KEY_V2 = "test-version-two-key-that-is-at-least-32-characters"
  process.env.ENCRYPTION_KEY_VERSION = "v2"
  try {
    const encrypted = encryptKey("sk-test-v2-provider-key")
    assert.match(encrypted.encryptedKey, /^v2:/)
    assert.equal(decryptKey(encrypted.encryptedKey, encrypted.iv), "sk-test-v2-provider-key")
  } finally {
    if (previousKey === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = previousKey
    if (previousV2Key === undefined) delete process.env.ENCRYPTION_KEY_V2
    else process.env.ENCRYPTION_KEY_V2 = previousV2Key
    if (previousVersion === undefined) delete process.env.ENCRYPTION_KEY_VERSION
    else process.env.ENCRYPTION_KEY_VERSION = previousVersion
  }
})

test("re-encrypts stored v1 keys under the selected v2 key", () => {
  const names = ["ENCRYPTION_KEY", "ENCRYPTION_KEY_V2", "ENCRYPTION_KEY_VERSION"] as const
  const previous = new Map(names.map((name) => [name, process.env[name]]))
  process.env.ENCRYPTION_KEY = "old-encryption-key-that-is-at-least-32-characters"
  process.env.ENCRYPTION_KEY_V2 = "new-encryption-key-that-is-at-least-32-characters"
  process.env.ENCRYPTION_KEY_VERSION = "v1"
  try {
    const oldRecord = encryptKey("sk-test-secret")
    process.env.ENCRYPTION_KEY_VERSION = "v2"
    const rotated = reencryptKey(oldRecord.encryptedKey, oldRecord.iv)
    assert.ok(rotated)
    assert.ok(rotated.encryptedKey.startsWith("v2:"))
    assert.equal(decryptKey(rotated.encryptedKey, rotated.iv), "sk-test-secret")
    assert.equal(reencryptKey(rotated.encryptedKey, rotated.iv), null)
  } finally {
    for (const name of names) {
      const value = previous.get(name)
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})

test("requires strong, separate secrets before production services start", () => {
  const names = [
    "NODE_ENV",
    "ENCRYPTION_KEY",
    "ENCRYPTION_KEY_V2",
    "ENCRYPTION_KEY_VERSION",
    "BETTER_AUTH_SECRET",
  ] as const
  const previous = new Map(names.map((name) => [name, process.env[name]]))
  process.env.NODE_ENV = "production"
  process.env.ENCRYPTION_KEY_VERSION = "v1"
  process.env.ENCRYPTION_KEY = "strong-encryption-key-value-that-is-over-32-characters"
  process.env.BETTER_AUTH_SECRET = "different-auth-secret-value-that-is-over-32-characters"
  delete process.env.ENCRYPTION_KEY_V2
  try {
    assert.doesNotThrow(() => assertSecurityEnvironment({ requireAuthSecret: true }))
    delete process.env.ENCRYPTION_KEY
    assert.throws(() => assertSecurityEnvironment({ requireAuthSecret: true }), /ENCRYPTION_KEY/)
    process.env.ENCRYPTION_KEY = "replace-with-a-production-placeholder-key-long-enough"
    assert.throws(() => assertSecurityEnvironment({ requireAuthSecret: true }), /placeholder/)
    process.env.ENCRYPTION_KEY = "strong-encryption-key-value-that-is-over-32-characters"
    process.env.BETTER_AUTH_SECRET = process.env.ENCRYPTION_KEY
    assert.throws(() => assertSecurityEnvironment({ requireAuthSecret: true }), /different values/)
    process.env.BETTER_AUTH_SECRET = "separate-auth-secret-value-that-is-over-32-characters"
    process.env.ENCRYPTION_KEY_VERSION = "v2"
    process.env.ENCRYPTION_KEY_V2 = "strong-v2-encryption-key-value-that-is-over-32-characters"
    delete process.env.ENCRYPTION_KEY
    assert.doesNotThrow(() => assertSecurityEnvironment({ requireAuthSecret: true }))
  } finally {
    for (const name of names) {
      const value = previous.get(name)
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})
