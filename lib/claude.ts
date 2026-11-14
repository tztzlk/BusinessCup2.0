import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { allow } from "./ratelimit";

export const MODEL = "claude-opus-5-5";

// Server-side refusal fallback: if the model declines, the API retries on the
// model's default fallback inside the same call.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** Thrown when ANTHROPIC_API_KEY is missing; routes answer 503 "upstream". */
export class ClaudeNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
  }
}

let client: Anthropic | null = null;
let warnedMissingKey = false;

// Defaults suit /api/extract (maxDuration 120 s): 60 s per attempt, one retry.
// Routes with a shorter budget pass tighter per-request options.
export function claude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.error("claude: ANTHROPIC_API_KEY is not set; document reading and explanations are disabled");
    }
    throw new ClaudeNotConfiguredError();
  }
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return client;
}

// Process-wide cap on Claude calls (extract + explain combined), on top of the per-IP limits,
// so a spread-out abuse pattern cannot run up the bill. Override with CLAUDE_HOURLY_CAP.
const DEFAULT_HOURLY_CAP = 300;

export function claudeHourlyCap(): number {
  const n = Number(process.env.CLAUDE_HOURLY_CAP);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_HOURLY_CAP;
}

/** Counts one Claude call against the global hourly cap; false when the cap is reached. */
export function allowClaudeCall(): boolean {
  return allow("claude:global", claudeHourlyCap(), 60 * 60 * 1000);
}

export type StructuredResult =
  | { ok: true; json: unknown }
  | { ok: false; reason: "refused" | "truncated" | "unreadable" };

/**
 * Reads a structured-output response without the SDK's parse helper, which throws a plain
 * AnthropicError on truncated or partial text. Checks stop_reason first, then parses only the
 * text written after the last fallback block (text before it is a declined model's partial output).
 */
export function readStructuredOutput(message: Pick<BetaMessage, "stop_reason" | "content">): StructuredResult {
  if (message.stop_reason === "refusal") return { ok: false, reason: "refused" };
  if (message.stop_reason === "max_tokens") return { ok: false, reason: "truncated" };

  let start = 0;
  message.content.forEach((block, i) => {
    if (block.type === "fallback") start = i + 1;
  });
  const text = message.content
    .slice(start)
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  if (!text.trim()) return { ok: false, reason: "unreadable" };
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}
