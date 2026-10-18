import assert from "node:assert/strict"
import test from "node:test"
import { isAllowedWebSocketOrigin } from "./websocket-origin.js"

test("only accepts the configured origin for WebSocket connections", () => {
  assert.equal(isAllowedWebSocketOrigin("https://app.example.com", "https://app.example.com"), true)
  assert.equal(
    isAllowedWebSocketOrigin("https://app.example.com", "https://app.example.com/"),
    true,
  )
  assert.equal(isAllowedWebSocketOrigin(undefined, "https://app.example.com"), false)
  assert.equal(isAllowedWebSocketOrigin("null", "https://app.example.com"), false)
  assert.equal(
    isAllowedWebSocketOrigin("https://attacker.example", "https://app.example.com"),
    false,
  )
  assert.equal(
    isAllowedWebSocketOrigin("https://app.example.com/path", "https://app.example.com"),
    false,
  )
  assert.equal(isAllowedWebSocketOrigin("https://app.example.com", "not a URL"), false)
})
