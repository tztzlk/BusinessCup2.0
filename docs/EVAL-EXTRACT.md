# Document reader accuracy (POST /api/extract)

Measured on 15 November 2026 (14 Nov, 19:25–19:27 UTC) against production (`https://paytrail-enushniki.fly.dev/api/extract`).
One run, 11 uploads, no retries. Code, fixtures and raw responses are in `scripts/eval-extract/`.

## Claim the deck may use

> On 9 synthetic pay stubs and W-2s in our own layouts (11 files: 9 PDFs plus 2 PNG screenshots), our reader read 209 of 209 fields (100%) exactly. Every field is still confirmed by the user before it is saved.

Short form: **"209 of 209 fields read exactly on 11 synthetic test documents (our own layouts)."**
Do not shorten it to "100% accurate": the documents are clean, digitally rendered and few (see Limitations).

## Method

**Reader under test.** The production `/api/extract` route as deployed: `lib/extraction.ts` (structured-output schema + system prompt), model `claude-opus-5-5` as configured in `lib/claude.ts`, `effort: "medium"`, with the server-side refusal fallback beta enabled. The API response does not say which model produced it; no call returned a refusal error.

**Ground truth.** All fictional, every employer marked "(SAMPLE)":

| Source | Documents |
|---|---|
| `mocks/couple.json`, `mocks/hourly.json`, `mocks/salaried.json` (`household.documents[].fields`) | 6 pay stubs (4 salaried, 1 hourly at 92 h × $22, 1 with a $0.00 401(k) line) |
| `lib/demo.ts` `coupleJanuary()` | 2 W-2s (Alex: box 12 D 4749.94; Jordan: box 12 D 1560.00, the planted mismatch, used as printed) |
| `public/samples/sample-paystub.pdf` (existing file, not re-rendered) | 1 pay stub (regular + overtime lines). Truth taken from its text layer (`pdftotext -layout`); every value is printed verbatim, nothing inferred |

The mock and W-2 objects were dumped to `scripts/eval-extract/fixtures/truth-raw.json` with a throwaway Vitest file (deleted afterwards) that wrote `couple/hourly/salaried` documents plus `coupleJanuary().documents.filter(d => d.docType === "w2")`. `render.mjs` adds the Acme stub and writes `fixtures/truth.json`.

**Rendering.** `scripts/eval-extract/render.mjs` builds HTML and prints it with headless Chrome (`--print-to-pdf`, Letter, 1 page each, 1.9–59 KB):

- Pay stubs in two generic payroll-provider styles, alternated: **stub-A** (stacked sections: earnings with hours/rate/current/YTD, taxes withheld, pre-tax deductions, employer contributions "not included in pay", gross/taxes/deductions/net summary for current and YTD) and **stub-B** (summary bar, earnings left, taxes/deductions with a pre-tax/after-tax column right, "Period Beginning / Period Ending / Check Date", "Bi-Weekly"). Dates printed MM/DD/YYYY, money with thousands separators. Salaried stubs print hours but leave rate blank.
- W-2s in our own box layout (boxes a–e, 1–20 labeled by number and name, box 12a–d code/amount, box 13 checkboxes, empty state boxes since the household is in Texas). Not the official IRS form; fake identifiers (`900-00-0000 (FAKE)`, EIN `00-0000000 (FAKE)`).
- Every page carries a large diagonal "SAMPLE — fictional data" watermark that crosses some numbers.
- **PNG variants:** the hourly stub (stub-A) and Alex's W-2 were also captured with `google-chrome --headless=new --screenshot` at 1200 × 1553 px (150–180 KB). The PDFs have a text layer; the PNGs force the model to read pixels.

**Runner.** `run.mjs` uploads each file as multipart field `file` with its MIME type, 6 s apart, logs every call to `results/calls.jsonl`, refuses to go past 12 calls and stops on 429/503. One smoke test (Alex's stub) was scored first, then the other 10 files were sent once each.

## Scoring rules

Applied mechanically by `scripts/eval-extract/score.mjs`:

- `documentType` must equal the truth (reported separately; if wrong or the call fails, every field of that document counts as wrong).
- Dates (`payPeriodStart`, `payPeriodEnd`, `payDate`) and `payFrequency`: exact string match. `taxYear`: exact.
- Money, hours and rate: exact to the cent, `|expected − got| < 0.005`. An expected `null` (value not printed, e.g. rate on a salaried stub) must come back `null`.
- `employerName`: compared after lowercasing and removing punctuation and extra whitespace. A reading that only lacks the "(SAMPLE)" suffix counts as correct and is tallied separately.
- Booleans (`preTax`, `box13RetirementPlan`): exact.
- Line items (`earnings`, `taxes`, `deductions`, `employerContributions`, `box12`, `state`) are matched by `type` (box 12 by `code`, state by `state`). Each sub-field of a matched line (current, ytd, hours, rate, preTax, amount, box16/17) is one field. A missing line makes all its sub-fields wrong; an extra line adds its sub-fields to the total as wrong.
- Totals are derived per document; gross/net totals count as "amounts, current period" or "YTD".
- A mismatch counts as "flagged" if the model listed its path (or a parent path) in `confidence`.

## Results

**documentType correct: 11 / 11. HTTP errors: 0. Documents with server schema warnings: 0. Fields read exactly: 209 / 209 (100%).**
Of the 209 fields, 5 have an expected value of `null` (rate not printed on salaried stubs); all 5 came back `null`.

| Group | Files | Fields | Exact | % |
|---|---:|---:|---:|---:|
| All files | 11 | 209 | 209 | 100% |
| PDF only (9 unique documents) | 9 | 176 | 176 | 100% |
| PNG screenshots | 2 | 33 | 33 | 100% |
| Pay stubs | 8 | 179 | 179 | 100% |
| W-2s | 3 | 30 | 30 | 100% |

### Per document

| Document | Layout | File | Latency | documentType | Fields | Exact | Flagged uncertain |
|---|---|---|---:|---|---:|---:|---:|
| couple_doc_alex_1031 | stub-A | PDF | 5.4 s | ok | 26 | 26 | 0 |
| couple_doc_jordan_1031 | stub-B | PDF | 4.5 s | ok | 21 | 21 | 0 |
| hourly_doc_rosa_1106 | stub-A | PDF | 5.0 s | ok | 23 | 23 | 0 |
| hourly_doc_rosa_1106_png | stub-A | PNG | 5.6 s | ok | 23 | 23 | 0 |
| hourly_doc_tom_1106 | stub-B | PDF | 5.6 s | ok | 18 | 18 | 0 |
| salaried_doc_nina_1031 | stub-A | PDF | 4.7 s | ok | 23 | 23 | 0 |
| salaried_doc_marcus_1031 | stub-B | PDF | 4.6 s | ok | 18 | 18 | 0 |
| couple_doc_alex_1031_w2 | W-2 | PDF | 5.3 s | ok | 10 | 10 | 0 |
| couple_doc_alex_1031_w2_png | W-2 | PNG | 5.0 s | ok | 10 | 10 | 0 |
| couple_doc_jordan_1031_w2 | W-2 | PDF | 5.0 s | ok | 10 | 10 | 1 |
| acme_sample_paystub | public sample | PDF | 5.8 s | ok | 27 | 27 | 0 |

Latency is the full HTTP round trip measured by the runner: 4.5–5.8 s per document.

### Per field category

| Category | Fields | Exact |
|---|---:|---:|
| Dates, tax year, pay frequency | 35 | 35 |
| Employer name | 11 | 11 |
| Amounts, current period (incl. gross/net) | 61 | 61 |
| Year-to-date amounts | 53 | 53 |
| Hours and rate | 18 | 18 |
| Booleans (pre-tax, box 13) | 10 | 10 |
| W-2 money boxes (1–6, 12, 16–17) | 21 | 21 |

### Mismatches

None. Notes:

- **Name suffix:** 1 of 11 employer names was counted correct only under the suffix rule. On the Acme sample the model returned `"Acme Logistics LLC"` without "(SAMPLE)". Strict string equality would give 208/209.
- **Uncertainty flags:** the model flagged 1 field, Jordan's W-2 `box6MedicareWithheld` (medium). The value was correct (1131). With no mismatches there is nothing to compare the flags against.
- **Planted errors kept as printed:** the reader did not "fix" the documents. Rosa's 92 regular hours with no overtime line, Jordan's $0.00 401(k) line and Jordan's W-2 box 12 D of 1560.00 were all returned exactly as printed. The engine's findings depend on this.
- No extra or missing line items. The W-2s returned `state: []` for the empty state boxes, and the box 12 codes matched.

## Limitations

- **Synthetic and clean.** Every document was rendered digitally from HTML (or is our own text-only sample PDF). Real-world uploads are often crumpled phone photos, skewed scans, low-contrast prints or multi-page provider PDFs. This test says nothing about those.
- **Our own layouts.** Two stub styles, one W-2 layout and the Acme sample, all designed by us. They are not ADP/Paychex/Gusto/Workday stubs or the official IRS W-2.
- **PDFs have a text layer.** Chrome's PDFs carry real text, so the model may have read embedded text rather than pixels. Only the 2 PNGs (33 fields) test pure image reading.
- **Small N, one run.** 9 unique documents, 11 files, 209 fields, one call each. Fields within a document are not independent. With 0 errors in 209 fields, the "rule of three" puts the 95% upper bound on the per-field error rate near 3/209 ≈ 1.4%, but only under an independence assumption that does not hold. Treat it as a smoke-level result, not a benchmark.
- **Easy content.** Arithmetic is consistent, single page, Texas (no state or local tax lines), few deduction types (no Roth, HSA, dental or vision, no multiple 401(k) lines), at most 2 earnings lines, no box 12 beyond code D, no state rows on the W-2s.
- Line-label mapping was only tested on the labels we printed (e.g. "Social Security (OASDI)", "Medical", "401(k) Employer Match"). Unusual provider labels may map to the wrong enum type.

## Reproduce

```bash
node scripts/eval-extract/render.mjs          # fixtures/*.pdf, *.png, truth.json (needs google-chrome, pdfinfo)
node scripts/eval-extract/run.mjs --all       # calls production; skips fixtures that already have a 200 response
node scripts/eval-extract/score.mjs           # results/score.md, results/score.json
```

Each run of `run.mjs` costs one Claude call per file and counts against the per-IP limit (15 per 10 min) and the hourly server cap.
