import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";

// Server-side refusal fallback: if the model declines, the API retries on the
// model's default fallback inside the same call.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;

export function claude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic({ timeout: 90_000, maxRetries: 2 });
  return client;
}
