import assert from "node:assert/strict"
import { test } from "node:test"
import { ApiError, apiFetch, apiJson } from "./api-client"

test("apiFetch includes browser credentials by default", async (context) => {
  const originalFetch = globalThis.fetch
  let requestInput: RequestInfo | URL | undefined
  let requestInit: RequestInit | undefined
  globalThis.fetch = async (input, init) => {
    requestInput = input
    requestInit = init
    return new Response("{}", { status: 200 })
  }
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  await apiFetch("/api/questions")
  assert.equal(requestInput, "/api/questions")
  assert.equal(requestInit?.credentials, "include")
})

test("apiJson returns typed JSON and surfaces the API error field", async (context) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.credentials, "include")
    return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 })
  }
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  await assert.rejects(apiJson("/api/submissions"), (error: unknown) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.message, "Rate limited")
    assert.equal(error.status, 429)
    return true
  })
})
