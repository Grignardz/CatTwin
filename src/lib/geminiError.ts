/**
 * Turns a raw Gemini/Firebase AI Logic error into a short, user-facing
 * message. Gemini's SDK errors are long technical dumps (full request URLs,
 * JSON quota metadata, docs links) that look broken when shown directly in
 * the UI — this extracts the one thing that actually matters to the user.
 */
export function toFriendlyGeminiError(
  err: unknown,
  fallback = "Failed to get a response. Please try again.",
): string {
  const message = err instanceof Error ? err.message : "";
  if (/\b429\b/.test(message) || /quota/i.test(message)) {
    return "The AI has hit its usage limit for now. Please wait a moment and try again.";
  }
  if (/\b503\b/.test(message) || /unavailable/i.test(message)) {
    return "The AI service is temporarily unavailable. Please try again shortly.";
  }
  if (/not configured/i.test(message)) {
    return message; // already a clear, actionable message (missing Firebase env vars)
  }
  return message || fallback;
}
