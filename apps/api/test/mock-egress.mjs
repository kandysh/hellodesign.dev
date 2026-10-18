const upstreamUrl = process.env.TEST_PROVIDER_URL
if (!upstreamUrl) throw new Error("TEST_PROVIDER_URL is required by the API integration harness")

const nativeFetch = globalThis.fetch.bind(globalThis)
const providerHosts = new Set(["api.openai.com", "api.resend.com"])

globalThis.fetch = async (input, init) => {
  const request = input instanceof Request ? input : new Request(input, init)
  const originalUrl = new URL(request.url)
  if (!providerHosts.has(originalUrl.hostname)) return nativeFetch(input, init)

  const mockUrl = new URL(
    `${originalUrl.hostname}${originalUrl.pathname}${originalUrl.search}`,
    upstreamUrl.endsWith("/") ? upstreamUrl : `${upstreamUrl}/`,
  )
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.clone().arrayBuffer()
  return nativeFetch(
    new Request(mockUrl, {
      method: request.method,
      headers: request.headers,
      body,
      redirect: request.redirect,
      signal: request.signal,
    }),
  )
}
