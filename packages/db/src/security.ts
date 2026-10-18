const PLACEHOLDER_SECRET =
  /(change[-_ ]?before|change[-_ ]?in[-_ ]?production|replace[-_ ]?with|your[-_ ]?secret|placeholder|fallback[-_ ]?key|example[-_ ]?secret)/i
export type EncryptionKeyVersion = "v1" | "v2"

export function getCurrentEncryptionKeyVersion(): EncryptionKeyVersion {
  const version = process.env.ENCRYPTION_KEY_VERSION ?? "v1"
  if (version !== "v1" && version !== "v2") {
    throw new Error(`Unsupported ENCRYPTION_KEY_VERSION: ${version}`)
  }
  return version
}

function requireSecret(name: string, value: string | undefined): string {
  if (!value || value.length < 32) {
    throw new Error(`${name} must be configured with at least 32 characters`)
  }
  if (process.env.NODE_ENV === "production" && PLACEHOLDER_SECRET.test(value)) {
    throw new Error(`${name} must not use a placeholder value in production`)
  }
  return value
}

export function assertSecurityEnvironment(options: { requireAuthSecret?: boolean } = {}): void {
  const currentVersion = getCurrentEncryptionKeyVersion()
  getEncryptionSecret(currentVersion)
  const previousVersion = currentVersion === "v1" ? "v2" : "v1"
  const previousEnvName = previousVersion === "v1" ? "ENCRYPTION_KEY" : "ENCRYPTION_KEY_V2"
  if (process.env[previousEnvName]) getEncryptionSecret(previousVersion)
  if (options.requireAuthSecret) {
    const authSecret = requireSecret("BETTER_AUTH_SECRET", process.env.BETTER_AUTH_SECRET)
    if (authSecret === process.env.ENCRYPTION_KEY || authSecret === process.env.ENCRYPTION_KEY_V2) {
      throw new Error("BETTER_AUTH_SECRET and encryption keys must be different values")
    }
  }
}

export function getEncryptionSecret(
  version: EncryptionKeyVersion = getCurrentEncryptionKeyVersion(),
): string {
  const envName = version === "v1" ? "ENCRYPTION_KEY" : "ENCRYPTION_KEY_V2"
  return requireSecret(envName, process.env[envName])
}
