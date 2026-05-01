/**
 * Fetch wrapper with exponential backoff retry on network failures
 * Max 3 attempts, delays: 1s → 2s → 4s
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // Retry on server errors (5xx) or network issues
      if (!response.ok && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Retry on network error
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
    }
  }

  throw lastError || new Error("Network request failed after multiple retries")
}

/**
 * Detect if error is network-related (not parsing, auth, etc)
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Network errors in fetch() are TypeError
    // Common messages: "Failed to fetch", "NetworkError when attempting to fetch resource"
    return (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError") ||
      error.message.includes("fetch")
    )
  }
  return false
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(text: string, fallback = null) {
  try {
    return JSON.parse(text)
  } catch {
    console.error("JSON parse error:", text)
    return fallback
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  shouldRetry = (error: unknown) => isNetworkError(error),
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        throw error
      }

      const delay = Math.pow(2, attempt) * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
