import assert from "node:assert/strict";
import test from "node:test";

import { validateRewriteResponse } from "../src/rewriteResponse.js";

test("accepts a complete provider response", () => {
  const response = {
    rewritten: "Hello, this is the revised message.",
    source: "provider",
    request_id: "request-123",
    fallback_reason: null,
  };

  assert.equal(validateRewriteResponse(response), response);
});

test("accepts a categorized backend fallback", () => {
  const response = {
    rewritten: "Hello, this is a local revision.",
    source: "fallback",
    request_id: "request-456",
    fallback_reason: "billing",
  };

  assert.equal(validateRewriteResponse(response), response);
});

test("rejects malformed successful responses", () => {
  for (const response of [
    {},
    { rewritten: "", source: "provider", request_id: "request-1" },
    { rewritten: "text", source: "unknown", request_id: "request-2" },
    { rewritten: "text", source: "provider", request_id: "" },
  ]) {
    assert.throws(() => validateRewriteResponse(response), /invalid_rewrite_response/);
  }
});
