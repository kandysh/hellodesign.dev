export function isAllowedWebSocketOrigin(
  origin: string | undefined,
  configuredWebUrl: string,
): boolean {
  if (!origin) return false
  try {
    return origin === new URL(configuredWebUrl).origin
  } catch {
    return false
  }
}
