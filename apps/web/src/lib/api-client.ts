export const API_BASE_URL = import.meta.env?.VITE_API_URL ?? ""

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function apiUrl(path: string): string {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const requestInput = typeof input === "string" && input.startsWith("/") ? apiUrl(input) : input
  return fetch(requestInput, { credentials: "include", ...init })
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init)
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : payload &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof payload.message === "string"
          ? payload.message
          : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  return payload as T
}
