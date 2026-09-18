import assert from "node:assert/strict";
import test from "node:test";
import { AIProviderError, getConfiguredProvider } from "./provider.ts";

const originalFetch = globalThis.fetch;
const SIGNAL = new AbortController().signal;

function testProvider() {
  const configured = getConfiguredProvider({
    AI_API_URL: "https://provider.test/openai/chat/completions",
    AI_API_KEY: "test-credential-not-a-secret",
    AI_MODEL: "test-model",
  });
  if (!configured) throw new Error("provider not configured");
  return configured;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("a non-2xx google error captures status, code, provider status, and capped message", async () => {
  globalThis.fetch = async () =>
    jsonResponse(401, [
      { error: { code: 401, message: `Invalid credentials. ${"Detail ".repeat(60)}`, status: "UNAUTHENTICATED" } },
    ]);

  await assert.rejects(
    testProvider().generateJson({ systemPrompt: "system", payload: { profile: "payload-marker" }, signal: SIGNAL }),
    (error: unknown) => {
      assert.ok(error instanceof AIProviderError);
      assert.equal(error.failure, "provider_http_error");
      assert.equal(error.status, 401);
      assert.ok(error.detail);
      assert.match(error.detail, /model=test-model/);
      assert.match(error.detail, /google_code=401/);
      assert.match(error.detail, /google_status=UNAUTHENTICATED/);
      assert.match(error.detail, /message="/);
      assert.ok(error.detail.length <= 240);
      assert.doesNotMatch(error.detail, /payload-marker/);
      assert.doesNotMatch(error.detail, /test-credential-not-a-secret/);
      return true;
    },
  );
});

test("an object-shaped provider error is captured the same way", async () => {
  globalThis.fetch = async () =>
    jsonResponse(404, { error: { code: 404, message: "models/test-model is not found for API version v1beta", status: "NOT_FOUND" } });

  await assert.rejects(
    testProvider().generateJson({ systemPrompt: "system", payload: {}, signal: SIGNAL }),
    (error: unknown) => {
      assert.ok(error instanceof AIProviderError);
      assert.equal(error.status, 404);
      assert.match(error.detail!, /google_status=NOT_FOUND/);
      assert.match(error.detail!, /is not found for API version v1beta/);
      return true;
    },
  );
});

test("a non-json error body keeps a small capped excerpt instead of being discarded", async () => {
  globalThis.fetch = async () => new Response("<html>gateway 404 page</html>", { status: 404 });

  await assert.rejects(
    testProvider().generateJson({ systemPrompt: "system", payload: {}, signal: SIGNAL }),
    (error: unknown) => {
      assert.ok(error instanceof AIProviderError);
      assert.equal(error.status, 404);
      assert.match(error.detail!, /model=test-model/);
      assert.match(error.detail!, /gateway 404 page/);
      assert.ok(error.detail!.length <= 240);
      return true;
    },
  );
});

test("a successful openai-shaped response still parses to the message content", async () => {
  globalThis.fetch = async () =>
    jsonResponse(200, { choices: [{ message: { content: '{"summary":"ok","focus":[]}' } }] });

  const result = await testProvider().generateJson({ systemPrompt: "system", payload: {}, signal: SIGNAL });
  assert.deepEqual(result, { summary: "ok", focus: [] });
});

test("an oversized success response still fails as provider_invalid_response", async () => {
  globalThis.fetch = async () => jsonResponse(200, { choices: [{ message: { content: "x".repeat(100_001) } }] });

  await assert.rejects(
    testProvider().generateJson({ systemPrompt: "system", payload: {}, signal: SIGNAL }),
    (error: unknown) => {
      assert.ok(error instanceof AIProviderError);
      assert.equal(error.failure, "provider_invalid_response");
      return true;
    },
  );
});
