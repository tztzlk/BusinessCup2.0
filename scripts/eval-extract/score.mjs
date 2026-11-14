#!/usr/bin/env node
// Scores saved /api/extract responses against fixtures/truth.json.
// Usage: node scripts/eval-extract/score.mjs   -> results/score.json + results/score.md (also printed)
//   EVAL_SET=real scores fixtures/truth-real.json against results-real/ instead.
//
// Rules (applied mechanically):
// - documentType must equal the truth; if it does not (or the call failed), every field of the doc is wrong.
// - Dates, payFrequency: exact string match. taxYear: exact number.
// - Money, hours, rate: |expected - got| < 0.005. Expected null must come back null (undefined counts as null).
// - employerName: compare after lowercasing and dropping punctuation/extra whitespace; a reading that only
//   lacks the "(SAMPLE)" suffix counts as correct and is tallied separately.
// - Booleans (preTax, box13RetirementPlan): exact.
// - Line items are matched by type (box12 by code, state by state); duplicates pair in order. Each numeric or
//   boolean sub-field of a matched line is one field. A missing line makes all its sub-fields wrong; an extra
//   line adds its sub-fields to the total, all wrong.
// - Real-world layouts (15 Nov): a truth line's type may be an array of acceptable enum values when the label is
//   genuinely ambiguous (e.g. a 457 plan: 401k_pretax or other); such matches are listed. Among candidate lines of an
//   acceptable type, the one whose current/amount equals the truth is paired first (labels are not in the schema).
//   A scalar left out of the truth, or a section set to "skip", is not scored and is listed as ambiguous.
// - A mismatch is "flagged" if the model listed its path (or a parent path) in confidence (uncertainFields).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SET = process.env.EVAL_SET ? `-${process.env.EVAL_SET}` : "";
const truth = JSON.parse(readFileSync(join(here, "fixtures", `truth${SET}.json`), "utf8"));
const results = join(here, `results${SET}`);

const SUFFIX = /\s*\(sample\)\s*$/i;
const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const isNull = (v) => v === null || v === undefined;
const numEq = (e, g) => (isNull(e) ? isNull(g) : typeof g === "number" && Math.abs(e - g) < 0.005);

const LINES = {
  paystub: {
    earnings: { key: "type", fields: { current: ["amounts_current", numEq], ytd: ["ytd", numEq], hours: ["hours_rate", numEq], rate: ["hours_rate", numEq] } },
    taxes: { key: "type", fields: { current: ["amounts_current", numEq], ytd: ["ytd", numEq] } },
    deductions: { key: "type", fields: { current: ["amounts_current", numEq], ytd: ["ytd", numEq], preTax: ["flags", (e, g) => e === g] } },
    employerContributions: { key: "type", fields: { current: ["amounts_current", numEq], ytd: ["ytd", numEq] } },
  },
  w2: {
    box12: { key: "code", fields: { amount: ["w2_boxes", numEq] } },
    state: { key: "state", fields: { box16Wages: ["w2_boxes", numEq], box17Withheld: ["w2_boxes", numEq] } },
  },
};
const SCALARS = {
  paystub: {
    payPeriodStart: ["dates", (e, g) => e === g],
    payPeriodEnd: ["dates", (e, g) => e === g],
    payDate: ["dates", (e, g) => e === g],
    payFrequency: ["dates", (e, g) => e === g],
    grossCurrent: ["amounts_current", numEq],
    netCurrent: ["amounts_current", numEq],
    grossYtd: ["ytd", numEq],
  },
  w2: {
    taxYear: ["dates", (e, g) => e === g],
    box1Wages: ["w2_boxes", numEq],
    box2FederalWithheld: ["w2_boxes", numEq],
    box3SsWages: ["w2_boxes", numEq],
    box4SsWithheld: ["w2_boxes", numEq],
    box5MedicareWages: ["w2_boxes", numEq],
    box6MedicareWithheld: ["w2_boxes", numEq],
    box13RetirementPlan: ["flags", (e, g) => e === g],
  },
};

function flaggedBy(confidence, path) {
  if (!path || !confidence) return null;
  for (const [k, v] of Object.entries(confidence)) {
    if (k === path || path.startsWith(`${k}.`) || path.startsWith(`${k}[`)) return v;
  }
  return null;
}

function scoreDoc(t, saved) {
  const res = saved?.response;
  const ok200 = saved?.status === 200 && res && typeof res.documentType === "string";
  const docTypeOk = ok200 && res.documentType === t.docType;
  const got = docTypeOk ? res.fields : null;
  const conf = docTypeOk ? (res.confidence ?? {}) : {};
  const rows = [];
  const altTypes = [];
  const push = (label, category, expected, gotVal, ok, gotPath, note = "") =>
    rows.push({ field: label, category, expected, got: gotVal, ok, gotPath: got ? gotPath : null, flagged: ok ? null : flaggedBy(conf, gotPath), note: got ? note : note || "no result" });

  const skipped = [];
  // employerName
  if (!("employerName" in t.fields)) skipped.push("employerName");
  else {
    const e = t.fields.employerName;
    const g = got?.employerName;
    let ok = got != null && norm(e) === norm(g);
    let note = "";
    if (!ok && got != null && norm(e.replace(SUFFIX, "")) === norm(g)) {
      ok = true;
      note = "suffix (SAMPLE) dropped";
    }
    push("employerName", "names", e, g, ok, "employerName", note);
  }
  for (const [f, [cat, eq]] of Object.entries(SCALARS[t.docType])) {
    if (!(f in t.fields)) {
      skipped.push(f);
      continue;
    }
    const g = got ? got[f] : undefined;
    push(f, cat, t.fields[f], g, got != null && eq(t.fields[f], g), f);
  }
  for (const [section, spec] of Object.entries(LINES[t.docType])) {
    if (t.fields[section] === "skip") {
      skipped.push(`${section} (all lines)`);
      continue;
    }
    const exp = t.fields[section] ?? [];
    const gl = got ? (Array.isArray(got[section]) ? got[section] : []) : [];
    const used = new Set();
    for (const line of exp) {
      // Real-layout extension: truth type may list several acceptable enum values; among lines of an
      // acceptable type, prefer the one whose current/amount equals the truth (labels are not in the schema).
      const want = Array.isArray(line[spec.key]) ? line[spec.key] : [line[spec.key]];
      const cands = got ? gl.map((x, i) => i).filter((i) => !used.has(i) && want.includes(gl[i]?.[spec.key])) : [];
      const money = spec.key === "type" ? "current" : "amount";
      const gi = cands.find((i) => numEq(line[money], gl[i]?.[money])) ?? cands[0] ?? -1;
      if (gi >= 0) {
        used.add(gi);
        if (gl[gi][spec.key] !== want[0]) altTypes.push(`${section}: ${want.join("|")} -> ${gl[gi][spec.key]}`);
      }
      for (const [f, [cat, eq]] of Object.entries(spec.fields)) {
        const label = `${section}[${want.join("|")}].${f}`;
        if (gi < 0) push(label, cat, line[f], undefined, false, null, got ? "line missing" : "no result");
        else push(label, cat, line[f], gl[gi][f], eq(line[f], gl[gi][f]), `${section}[${gi}].${f}`);
      }
    }
    gl.forEach((x, i) => {
      if (used.has(i)) return;
      for (const [f, [cat]] of Object.entries(spec.fields)) {
        push(`${section}[${x?.[spec.key]}].${f}`, cat, undefined, x?.[f], false, `${section}[${i}].${f}`, "extra line");
      }
    });
  }
  return {
    id: t.id,
    layout: t.layout,
    mime: t.mime,
    docType: t.docType,
    status: saved?.status ?? null,
    ms: saved?.ms ?? null,
    error: saved?.response?.error ?? null,
    gotDocType: res?.documentType ?? null,
    docTypeOk: Boolean(docTypeOk),
    warnings: docTypeOk || res?.documentType === "other" ? (res.warnings ?? []) : [],
    uncertain: Object.keys(conf).length,
    uncertainPaths: conf,
    total: rows.length,
    exact: rows.filter((r) => r.ok).length,
    suffixDropped: rows.filter((r) => r.note.startsWith("suffix")).length,
    skipped,
    altTypes,
    rows,
  };
}

const docs = [];
for (const t of truth) {
  const p = join(results, `${t.id}.json`);
  if (!existsSync(p)) continue; // not run
  docs.push(scoreDoc(t, JSON.parse(readFileSync(p, "utf8"))));
}

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : "n/a");
const agg = (ds) => {
  const rows = ds.flatMap((d) => d.rows);
  return { docs: ds.length, total: rows.length, exact: rows.filter((r) => r.ok).length };
};
const CATS = { dates: "Dates, tax year, pay frequency", names: "Employer name", amounts_current: "Amounts, current period (incl. gross/net)", ytd: "Year-to-date amounts", hours_rate: "Hours and rate", flags: "Booleans (pre-tax, box 13)", w2_boxes: "W-2 money boxes (1–6, 12, 16–17)" };

const all = agg(docs);
const groups = {
  "All documents": docs,
  "PDF only": docs.filter((d) => d.mime === "application/pdf"),
  "PNG only": docs.filter((d) => d.mime !== "application/pdf"),
  "Pay stubs (PDF+PNG)": docs.filter((d) => d.docType === "paystub"),
  "W-2s (PDF+PNG)": docs.filter((d) => d.docType === "w2"),
};
const allRows = docs.flatMap((d) => d.rows.map((r) => ({ ...r, doc: d.id })));
const mismatches = allRows.filter((r) => !r.ok);
const expectedNull = allRows.filter((r) => r.expected === null).length;

let md = "";
md += `Documents scored: ${docs.length}. documentType correct: ${docs.filter((d) => d.docTypeOk).length}/${docs.length}. `;
md += `HTTP errors: ${docs.filter((d) => d.status !== 200).length}. Docs with schema warnings: ${docs.filter((d) => d.warnings.length).length}.\n\n`;
md += `**Fields read exactly: ${all.exact} / ${all.total} (${pct(all.exact, all.total)})**. `;
md += `Of these fields, ${expectedNull} have an expected value of null (not printed, e.g. rate on a salaried stub).\n\n`;
md += `| Group | Docs | Fields | Exact | % |\n|---|---:|---:|---:|---:|\n`;
for (const [name, ds] of Object.entries(groups)) {
  const a = agg(ds);
  md += `| ${name} | ${a.docs} | ${a.total} | ${a.exact} | ${pct(a.exact, a.total)} |\n`;
}
md += `\n### Per document\n\n| Document | Layout | Type | HTTP | Latency | documentType | Fields | Exact | % | Flagged uncertain | Warnings |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n`;
for (const d of docs) {
  md += `| ${d.id} | ${d.layout} | ${d.mime === "application/pdf" ? "PDF" : "PNG"} | ${d.status} | ${d.ms ? (d.ms / 1000).toFixed(1) + " s" : ""} | ${d.docTypeOk ? "ok" : `WRONG (${d.gotDocType ?? d.error})`} | ${d.total} | ${d.exact} | ${pct(d.exact, d.total)} | ${d.uncertain} | ${d.warnings.length} |\n`;
}
md += `\n### Per field category\n\n| Category | Fields | Exact | % |\n|---|---:|---:|---:|\n`;
for (const [c, label] of Object.entries(CATS)) {
  const rs = allRows.filter((r) => r.category === c);
  if (rs.length) md += `| ${label} | ${rs.length} | ${rs.filter((r) => r.ok).length} | ${pct(rs.filter((r) => r.ok).length, rs.length)} |\n`;
}
const suffix = docs.reduce((a, d) => a + d.suffixDropped, 0);
md += `\nEmployer names counted correct only because the "(SAMPLE)" suffix was dropped: ${suffix}.\n`;
md += `\n### Every mismatch (${mismatches.length})\n\n`;
if (mismatches.length) {
  md += `| Document | Field | Expected | Got | Model path | Flagged uncertain | Note |\n|---|---|---|---|---|---|---|\n`;
  for (const r of mismatches) md += `| ${r.doc} | ${r.field} | ${JSON.stringify(r.expected) ?? "—"} | ${JSON.stringify(r.got) ?? "—"} | ${r.gotPath ?? "—"} | ${r.flagged ?? "no"} | ${r.note} |\n`;
} else md += "None.\n";
const flaggedAll = docs.flatMap((d) => Object.entries(d.uncertainPaths).map(([p, v]) => `${d.id}: ${p} (${v})`));
md += `\n### Fields the model flagged as uncertain (${flaggedAll.length})\n\n${flaggedAll.length ? flaggedAll.map((x) => `- ${x}`).join("\n") : "None."}\n`;
md += `\nMismatches that were flagged uncertain: ${mismatches.filter((r) => r.flagged).length} of ${mismatches.length}.\n`;
const warned = docs.filter((d) => d.warnings.length);
if (warned.length) md += `\n### Server warnings\n\n${warned.map((d) => `- ${d.id}: ${d.warnings.join("; ")}`).join("\n")}\n`;

md += `\n### Not scored (ambiguous ground truth)\n\n${docs.filter((d) => d.skipped.length).map((d) => `- ${d.id}: ${d.skipped.join(", ")}`).join("\n") || "None."}\n`;
md += `\n### Lines matched through an alternative accepted type\n\n${docs.filter((d) => d.altTypes.length).map((d) => `- ${d.id}: ${d.altTypes.join("; ")}`).join("\n") || "None."}\n`;
writeFileSync(join(results, "score.json"), JSON.stringify({ summary: all, docs }, null, 2));
writeFileSync(join(results, "score.md"), md);
console.log(md);
