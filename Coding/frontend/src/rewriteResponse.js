export function validateRewriteResponse(data) {
  // TESTER: [TEST CASE] The frontend accepts only the explicit backend rewrite contract.
  const valid =
    data
    && typeof data.rewritten === "string"
    && Boolean(data.rewritten.trim())
    && ["provider", "fallback"].includes(data.source)
    && typeof data.request_id === "string"
    && Boolean(data.request_id);

  if (!valid) {
    throw new Error("invalid_rewrite_response");
  }

  return data;
}
