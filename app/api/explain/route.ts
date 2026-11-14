import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { claude, FALLBACK_BETA, MODEL } from "@/lib/claude";
import { clientIpHash } from "@/lib/household";
import { allow } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Input carries only finding codes and numbers computed by the engine: no names,
// employers or free text, so no personal data reaches the model from here.
const Body = z.object({
  findings: z
    .array(
      z.object({
        code: z.string().regex(/^[A-Z0-9_]{2,40}$/),
        severity: z.enum(["info", "warning", "critical"]),
        amountUsd: z.number().finite(),
        actionKind: z.enum(["w4_change", "contribution_change", "ask_hr", "ask_w2c", "info"]),
        inputs: z.record(z.string().regex(/^[A-Za-z0-9_]{1,40}$/), z.number().finite()),
      }),
    )
    .max(20),
  projection: z.object({ balance: z.number().finite(), taxYear: z.number().int() }).nullable(),
});

const Output = z.object({
  summary: z.string(),
  items: z.array(z.object({ code: z.string(), title: z.string(), body: z.string() })),
});

const SYSTEM = `You write short, plain-English explanations for a US paycheck-checking app.
You receive findings computed by a deterministic tax engine. Each finding has a code, a dollar amount and the numbers used.
Rules:
- Never change, recompute or contradict the numbers. Quote amounts as given, rounded to whole dollars.
- One item per finding, same code. Title: max 8 words. Body: 2-3 sentences, what it means and what to do.
- summary: one sentence about the whole picture. If projection.balance > 0 the household is projected to owe that amount in April; if < 0, to get that refund.
- Calm, specific tone. No legal or tax advice wording such as "you must"; say "consider" or "you can".`;

export async function POST(req: Request) {
  const ip = (await clientIpHash()) ?? "unknown";
  if (!allow(`explain:${ip}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input", issues: parsed.error.issues }, { status: 400 });
  if (parsed.data.findings.length === 0) return NextResponse.json({ summary: "", items: [] });

  try {
    const response = await claude().beta.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low", format: betaZodOutputFormat(Output) },
      messages: [{ role: "user", content: JSON.stringify(parsed.data) }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ error: "no_explanation" }, { status: 422 });
    }
    return NextResponse.json(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error("explain: Claude API error", err.status, err.message);
      return NextResponse.json({ error: "upstream" }, { status: 502 });
    }
    console.error("explain: unexpected error", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
