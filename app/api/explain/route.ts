import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { allowClaudeCall, claude, ClaudeNotConfiguredError, FALLBACK_BETA, MODEL, readStructuredOutput } from "@/lib/claude";
import { clientIpHash, currentSession } from "@/lib/household";
import { readJson } from "@/lib/http";
import { allowRequest } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_INPUTS = 30;
// Real requests are a few KB (20 findings at most); anything near this is not from our UI.
const BODY_MAX_BYTES = 32 * 1024;

// Input carries only finding codes and numbers computed by the engine: no names,
// employers or free text, so no personal data reaches the model from here.
const Body = z.object({
  findings: z
    .array(
      z.object({
        // Optional: lets two findings with the same code (e.g. a match finding per employer) get separate texts.
        id: z.string().regex(/^f\d{1,2}$/).optional(),
        code: z.string().regex(/^[A-Z0-9_]{2,40}$/),
        severity: z.enum(["info", "warning", "critical"]),
        amountUsd: z.number().finite(),
        actionKind: z.enum(["w4_change", "contribution_change", "ask_hr", "ask_w2c", "info"]),
        // Bounded so a request cannot grow the prompt: the engine emits at most ~15 inputs per finding.
        inputs: z
          .record(z.string().regex(/^[A-Za-z0-9_]{1,40}$/), z.number().finite())
          .refine((o) => Object.keys(o).length <= MAX_INPUTS, { message: `At most ${MAX_INPUTS} inputs` }),
      }),
    )
    .max(20),
  projection: z.object({ balance: z.number().finite(), taxYear: z.number().int().min(2020).max(2100) }).nullable(),
});

const Output = z.object({
  summary: z.string(),
  items: z.array(z.object({ id: z.string().optional(), code: z.string(), title: z.string(), body: z.string() })),
});

const SYSTEM = `You write short, plain-English explanations for a US paycheck-checking app.
You receive findings computed by a deterministic tax engine. Each finding has a code, a dollar amount and the numbers used.
Rules:
- Never change, recompute or contradict the numbers. Quote amounts as given, rounded to whole dollars.
- One item per finding, with the same code (and the same id, if the finding has one). Title: max 8 words. Body: 2-3 sentences, what it means and what to do.
- Only quote dollar amounts that appear in that finding (amountUsd or inputs) or in projection.balance. If an amount is not given, describe it in words.
- summary: one sentence about the whole picture. If projection.balance > 0 the household is projected to owe that amount in April; if < 0, to get that refund; if 0, it is on track for April (say so, without owing, refund or an amount). If projection is null, do not mention a projection.
- The return for projection.taxYear is filed in April of the following year (tax year 2026 → April 2027). Write "in April" without a year, or with that following year.
- Calm, specific tone. No legal or tax advice wording such as "you must"; say "consider" or "you can".`;

export async function POST(req: Request) {
  const ip = (await clientIpHash()) ?? "unknown";
  const visitor = (await currentSession().catch(() => null))?.householdId ?? null;
  if (!allowRequest("explain", ip, visitor)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await readJson(req, BODY_MAX_BYTES);
  if (!body.ok) return body.response;
  const parsed = Body.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  if (parsed.data.findings.length === 0) return NextResponse.json({ summary: "", items: [] });
  if (!allowClaudeCall()) return NextResponse.json({ error: "busy" }, { status: 503 });

  try {
    // create() rather than parse(): parse() throws on truncated or partial text. The UI keeps the
    // engine's own text whenever this route answers with an error.
    const response = await claude().beta.messages.create(
      {
        model: MODEL,
        max_tokens: 4000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        system: SYSTEM,
        output_config: { effort: "low", format: betaZodOutputFormat(Output) },
        messages: [{ role: "user", content: JSON.stringify(parsed.data) }],
      },
      // Fits maxDuration (60 s); a failed call only means the engine text stays.
      { timeout: 50_000, maxRetries: 0 },
    );
    const read = readStructuredOutput(response);
    const out = read.ok ? Output.safeParse(read.json) : null;
    if (!out?.success) return NextResponse.json({ error: "no_explanation" }, { status: 422 });
    return NextResponse.json(out.data);
  } catch (err) {
    if (err instanceof ClaudeNotConfiguredError) return NextResponse.json({ error: "upstream" }, { status: 503 });
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "busy" }, { status: 503 });
    if (err instanceof Anthropic.APIError) {
      console.error("explain: Claude API error", err.status, err.message);
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }
    console.error("explain: unexpected error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
