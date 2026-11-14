#!/usr/bin/env node
// Uploads generated fixtures to POST /api/extract and saves the raw responses.
// Usage: node scripts/eval-extract/run.mjs <fixture-id> [...ids] | --all
//   EXTRACT_URL overrides the endpoint (default: production).
// Every call is appended to results/calls.jsonl; the runner refuses to exceed MAX_CALLS in total
// and stops at the first 429/503. Fixtures that already have a saved 200 response are skipped.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");
const results = join(here, "results");
const ledger = join(results, "calls.jsonl");

const URL_ = process.env.EXTRACT_URL ?? "https://paytrail-enushniki.fly.dev/api/extract";
const MAX_CALLS = Number(process.env.MAX_CALLS ?? 12);
const GAP_MS = 6000;

const truth = JSON.parse(readFileSync(join(fixtures, "truth.json"), "utf8"));
const args = process.argv.slice(2);
const ids = args.includes("--all") ? truth.map((t) => t.id) : args;
if (!ids.length) {
  console.error("usage: run.mjs <fixture-id>... | --all");
  process.exit(2);
}

const callsSoFar = () => (existsSync(ledger) ? readFileSync(ledger, "utf8").trim().split("\n").filter(Boolean).length : 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let first = true;
for (const id of ids) {
  const t = truth.find((x) => x.id === id);
  if (!t) throw new Error(`unknown fixture ${id}`);
  const out = join(results, `${id}.json`);
  if (existsSync(out) && JSON.parse(readFileSync(out, "utf8")).status === 200) {
    console.log(`skip ${id} (already has a 200 response)`);
    continue;
  }
  if (callsSoFar() >= MAX_CALLS) {
    console.error(`budget reached (${MAX_CALLS} calls); stopping`);
    process.exit(1);
  }
  if (!first) await sleep(GAP_MS);
  first = false;

  const bytes = readFileSync(join(fixtures, t.file));
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: t.mime }), t.file);
  const started = Date.now();
  appendFileSync(ledger, JSON.stringify({ id, at: new Date().toISOString() }) + "\n");
  let status = 0;
  let body;
  try {
    const res = await fetch(URL_, { method: "POST", body: form, signal: AbortSignal.timeout(180_000) });
    status = res.status;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  } catch (err) {
    body = { error: "network", message: String(err) };
  }
  const ms = Date.now() - started;
  writeFileSync(out, JSON.stringify({ id, file: t.file, mime: t.mime, status, ms, at: new Date().toISOString(), response: body }, null, 2));
  console.log(`${id}: HTTP ${status} in ${(ms / 1000).toFixed(1)} s${body?.error ? ` (${body.error})` : ""}`);
  if (status === 429 || status === 503) {
    console.error("rate limited or busy; stopping without retry");
    process.exit(1);
  }
}
console.log(`calls used so far: ${callsSoFar()} / ${MAX_CALLS}`);
