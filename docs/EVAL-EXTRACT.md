# Document reader accuracy (POST /api/extract)

Measured on 15 November 2026 (14 Nov, 19:25–19:27 UTC) against production (`https://paytrail-enushniki.fly.dev/api/extract`).
One run, 11 uploads, no retries. Code, fixtures and raw responses are in `scripts/eval-extract/`.

## Claim the deck may use

> On 9 synthetic pay stubs and W-2s in our own layouts (11 files: 9 PDFs plus 2 PNG screenshots), our reader read 209 of 209 fields (100%) exactly. Every field is still confirmed by the user before it is saved.

Short form: **"209 of 209 fields read exactly on 11 synthetic test documents (our own layouts)."**
Do not shorten it to "100% accurate": the documents are clean, digitally rendered and few (see Limitations).

**Updated claim covering both sets (15 Nov), keep the two numbers separate:**

> Our reader copied 209 of 209 fields exactly on 11 synthetic documents in our own layouts, and 198 of 198 scored fields on 6 documents in 5 real-world layouts: the official 2026 IRS Form W-2 filled with fictional data (as a PDF and as a simulated phone photo) and 4 sample pay stubs published by US university payroll offices (university payroll systems, not ADP or Gusto; public for years, so possibly in the model's training data). Small samples, one run each, 2 ambiguous items left unscored; every field is still confirmed by the user before it is saved.

Short form: **"209/209 fields on 11 synthetic test documents; 198/198 on the official IRS W-2 (PDF + simulated photo) and 4 published university pay-stub samples. One run; not ADP/Gusto stubs."** See [Real-world layouts and the official IRS W-2](#real-world-layouts-and-the-official-irs-w-2-15-nov) for what this does and does not show.

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

## Real-world layouts and the official IRS W-2 (15 Nov)

Measured on 15 November 2026 (14 Nov, 22:21–22:23 UTC) against production `/api/extract`, same reader as above.
6 uploads, one call each, no retries, no 429/503. This partly addresses the gap above (the synthetic set used only our own layouts and never the official W-2); it does not cover payroll-company stubs or real phone photos.

### Method

**Official IRS W-2 (ours, fictional, in the repo).** The 2026 fillable Form W-2 was downloaded from <https://www.irs.gov/pub/irs-pdf/fw2.pdf> (PDF title "2026 Form W-2", 11 pages). Page 4, **Copy B, "To Be Filed With Employee's FEDERAL Tax Return"**, was filled with pypdf with Jordan's W-2 from `lib/demo.ts` `coupleJanuary()` (dumped with a throwaway Vitest file outside the repo): box 1 78000.00, box 2 5000.06, box 3 78000.00, box 4 4836.00, box 5 78000.00, box 6 1131.00, box 12a D 1560.00 (the planted mismatch), box 13 "Retirement plan" checked, state boxes empty (Texas). Identifiers are fake: SSN `900-00-0001` (invalid, area 9xx), EIN `00-0000001`, control number `SAMPLE-0001`, employer "Bluebonnet Health (SAMPLE)", employee "Jordan Sample", made-up street addresses. The XFA layer was dropped, the fields were flattened into the page content (so the PDF has a text layer, like an employer's printed PDF), and a diagonal "SAMPLE — fictional data" watermark plus a red header line were overlaid. The bottom form on the page is left blank, as on a single-employee printout.
- `fixtures/official_w2_jordan.pdf`: 1 page, 2.4 MB (the IRS form's embedded fonts).
- `fixtures/official_w2_jordan_photo.png`: the page rendered at 165 dpi, cropped to the top form, put on a dark "desk" background, rotated 1.8°, with an uneven lighting gradient, a slight blur and sensor-style noise; 1400 × 977 px. It is a simulated photo, not a real camera shot.
- Generators: `scripts/eval-extract/fill-official-w2.py`, `scripts/eval-extract/photo-like.py`.

**Published sample pay stubs (third party, NOT in the repo).** Four pay-stub examples that US payroll offices publish to explain their stubs, with sample or mascot identities. The files and their hand-transcribed truth stay outside the repo (copyright); they can be downloaded again from these URLs:

| Id | Publisher and layout | File URL | Where it is published | Identity shown | Uploaded as |
|---|---|---|---|---|---|
| usc_sample_paystub | University of South Carolina, PeopleSoft HCM "Sample Paycheck Stub" (Nov 2024), stub is an embedded image with explanatory callouts around it | <https://oiraa.sc.edu/about/offices_and_divisions/payroll/documents/hcm_peoplesoft_resources/read_pay_stub.pdf> | listed as "Sample Paycheck Stub" on USC Payroll's Employee Self Service page, <https://www.sc.edu/about/offices_and_divisions/payroll/hcm_training_and_access/employee_self_service/index.php> | "Sample Name, 123 Sample" | the published 1-page PDF |
| arizona_sample_paystub | University of Arizona, "UAccess Employee: How to Read Your Paystub" poster, PeopleSoft layout; the PDF's text layer is OCR with errors ("293-83", "9 264.00", "Short-Tenn") | <https://financialservices.arizona.edu/sites/fso/files/2017-12/PaycheckPoster.pdf> | Financial Services Office site (now finance.arizona.edu/payroll); linking page not verified | "Wilbur Wildcat, 1 Anywhere Street, Tucson, AZ 99999" (mascot) | the published 1-page poster PDF (26.6 × 20 in) |
| weber_sample_paystub | Weber State University "How to Read My Pay Stub", Weber State's own "Pay Stub Summary" format, scanned image | <https://www.weber.edu/wsuimages/payroll/pdfs/HOW%20TO%20READ%20MY%20PAY%20STUB.pdf> | Weber State Payroll site; linking page not verified | "Waldo Wildcat, Wildcat Lane" (mascot) | the published 1-page PDF |
| passhe_iup_sample_paystub | Indiana University of Pennsylvania / PA State System (PASSHE ESS, SAP-style), "Understanding Your Pay Statement" | <https://www.iup.edu/Payroll/files/forms/understanding-your-pay-statement.pdf> | IUP Payroll forms page, <https://www.iup.edu/payroll/forms/> | placeholders "LAST NAME, FIRST NAME / STREET ADDRESS", masked personnel number. Anonymized, not explicitly called fictional | the stub image embedded on page 1, extracted as a 669 × 835 px PNG (96 dpi) |

No payroll-company sample (ADP, Paychex, Gusto, Workday) was used: we found no official provider sample with fictional data in the time available. A Southern Oregon University Workday "sample pay slip" was skipped because it is a real slip with black redaction boxes.

**Ground truth.** Hand-transcribed from high-resolution renders (embedded images extracted with `pdfimages`, zoomed crops for the Arizona poster). Every transcribed stub was checked arithmetically: the earnings, taxes and deductions add up to the printed section totals, and gross − taxes − deductions = printed net pay, for current and YTD. Values that are not printed are `null` (rate on the USC and IUP stubs, line-level YTD on Weber, current hours of Arizona's holiday/sick lines). Pay frequency comes from the printed wording or the period length (USC prints no frequency; 10/16–10/31 is the second half of a month, so `semimonthly`).

**Scoring.** The same `score.mjs` rules, plus three additions needed for real labels (backward compatible: the synthetic set scores the same, 209/209):
1. When a label maps to our enum in more than one defensible way, the truth lists the acceptable types, preferred one first: 457 plan and Arizona State Retirement System (ASRS) contributions → `401k_pretax` or `other`; IUP "ARP-EE combined cont" → `other` or `401k_pretax`; employer ASRS → `other` or `401k_match`; Arizona "Sick Taken" → `pto` or `other`; IUP "APSCUF sponsored activity" pay → `other`, `bonus` or `regular`; PA unemployment tax → `other` or `state_income`; local services tax → `local` or `other`. Lines that matched only through a non-preferred type are listed. **There were none**: the model picked the preferred type every time, so a single-type truth gives the same score.
2. Within one type, the model line whose `current` equals the truth is paired first (labels are not in the schema, so several `other` lines are otherwise paired by order). The model kept the printed order everywhere, so order-only pairing gives the same score.
3. Ambiguous ground truth is left out and listed: Weber's "Employer Funded Benefit Information" section (employer FICA, unemployment and workers' comp: not a benefit contribution in our sense, so it is unclear whether it belongs in `employerContributions`) and the IUP employer name (the stub prints both "Pennsylvania's State System of Higher Education" and "Indiana University").

### Results

**documentType correct: 6 / 6. HTTP errors: 0. Server schema warnings: 0. Fields read exactly: 198 / 198.** 8 of these fields have an expected `null`; all 8 came back `null`.

| Group | Files | Fields | Exact |
|---|---:|---:|---:|
| Official IRS W-2 (PDF + photo-like PNG) | 2 | 20 | 20 |
| Published university pay-stub samples | 4 | 178 | 178 |
| All real-world documents (5 layouts) | 6 | 198 | 198 |

| Document | File | Latency | documentType | Fields | Exact | Flagged uncertain |
|---|---|---:|---|---:|---:|---:|
| official_w2_jordan (IRS Copy B, flattened) | PDF | 10.7 s | ok | 10 | 10 | 0 |
| official_w2_jordan_photo (simulated photo) | PNG | 5.7 s | ok | 10 | 10 | 0 |
| usc_sample_paystub (PeopleSoft, image + callouts) | PDF | 8.3 s | ok | 30 | 30 | 1 |
| arizona_sample_paystub (PeopleSoft poster, 4 earnings, 10 deductions, 8 employer lines) | PDF | 15.6 s | ok | 78 | 78 | 3 |
| weber_sample_paystub (scan) | PDF | 10.5 s | ok | 26 | 26 | 4 |
| passhe_iup_sample_paystub (SAP-style, low-res, state + 2 local taxes) | PNG | 15.6 s | ok | 44 | 44 | 2 |

| Category | Fields | Exact |
|---|---:|---:|
| Dates, tax year, pay frequency | 18 | 18 |
| Employer name | 5 | 5 |
| Amounts, current period (incl. gross/net) | 64 | 64 |
| Year-to-date amounts | 60 | 60 |
| Hours and rate | 16 | 16 |
| Booleans (pre-tax, box 13) | 21 | 21 |
| W-2 money boxes (1–6, 12, 16–17) | 14 | 14 |

Latency was 5.7–15.6 s per document, higher than on the synthetic set (4.5–5.8 s); the longest were the two densest stubs.

### Mismatches and notes

No mismatches. Notes:

- **Official W-2:** both the PDF and the photo-like PNG returned all 10 fields exactly, including box 12 code D 1560.00, box 13 checked and `state: []`. The planted inconsistency (box 1 = box 3 = 78000 although box 12 D reports a 1560 deferral) was copied as printed, not "fixed". The employer name kept its "(SAMPLE)" suffix.
- **OCR noise ignored:** the Arizona PDF's text layer has OCR errors ("293-83", "9 264.00"); the model returned the correct values (293.83 is a section total and not scored; 9264.00 is scored and was exact).
- **Unscored, for the record:** on Weber's employer-funded section the model returned 4 `other` employer lines with all 8 printed values exact (5.70/18.24, 24.35/77.99, 1.00/2.30, 0.60/1.94) and flagged the section as uncertain. On IUP it returned the employer name "Pennsylvania's State System of Higher Education". Counting these would give 207/207. Under the strictest reading (Weber's employer FICA, unemployment and workers' comp lines are not employer contributions, so the 4 lines are extras, and the IUP employer is "Indiana University", printed in the University field), the same responses score 198/207 (95.7%); the 9 differences are judgement calls about what belongs in a field, not misread numbers.
- **Classification choices** (the model's picks, all equal to our preferred type): 403(b) TSA and 457 plan → `401k_pretax`; ASRS, ARP and supplemental life → `other` pre-tax; union dues, disability and dependent life → `other` post-tax; vacation and sick → `pto`; "Fed MED/EE", "Fed OASDI/EE", "FICA Ret", "FICA Med" → `medicare` / `social_security`; PA unemployment → `other`; Indiana Borough LST and Pine Township → `local`.
- **Uncertainty flags:** 10 paths flagged, all on genuinely ambiguous choices (USC pay frequency, the type of the 457/ARP/PA-unemployment/Weber deduction lines, Weber's pre-tax flag and employer section, two Arizona employer YTD values). All 10 values were correct, so the flags were over-cautious but pointed at the right places.
- **Annotations did not confuse it:** three of the four samples are explainer pages with arrows, numbered callouts and paragraphs around the stub; no explainer text leaked into fields.

### Limitations

- **Small N, one run each.** 6 documents, 198 fields, fields within a document are not independent. Together with the synthetic set: 0 errors in 407 scored fields on 17 files, which is a smoke test, not a benchmark.
- **Not payroll-company layouts.** The stubs come from university payroll systems (2 PeopleSoft, 1 SAP-style, 1 Weber State's own format). No ADP, Paychex, Gusto or Workday stub was tested, and those are what most W-2 workers get.
- **Published samples may be in the model's training data.** They have been public since 2009–2024. We cannot rule out memorization; our own W-2 fill (new values on the 2026 form) is the cleanest test of the official layout.
- **The W-2 "photo" is simulated** (rotation, lighting, blur, noise added in software). Real phone photos of crumpled paper, glare or motion blur were not tested. The W-2 values are typed in a clean font, as payroll software prints them; handwritten or dot-matrix W-2s were not tested.
- **Truth check.** Truth was first transcribed by one person. A second reviewer then downloaded the 4 samples again from the URLs above (byte-identical to the uploaded files), re-transcribed 155 values (dates, pay frequency, every current/YTD amount, hours and rates, gross and net) without looking at the first truth, and found 0 differences. Both readings could still share a misinterpretation of a label (e.g. which enum type a line belongs to).
- **Relaxed type matching.** 8 lines accept more than one enum type and 2 items were not scored (see Scoring). The model used the preferred type in all 8, so this did not change the result, but the rule exists.
- **Old pay years** (2009, 2014, 2019, 2023) and no multi-page PDFs.

### Reproduce

The official W-2 part is reproducible from the repo; the third-party stubs need the files downloaded from the URLs above and a truth file kept outside the repo.

```bash
EVAL_SET=real node scripts/eval-extract/run.mjs --all     # fixtures/truth-real.json -> results-real/ (skips saved 200s)
EVAL_SET=real node scripts/eval-extract/score.mjs         # results-real/score.md, score.json
```

`results-real/calls.jsonl` is the full ledger of the 6 production calls made on 15 Nov (2 W-2 + 4 third-party stubs); only the two W-2 responses are kept in the repo.

## Reproduce

```bash
node scripts/eval-extract/render.mjs          # fixtures/*.pdf, *.png, truth.json (needs google-chrome, pdfinfo)
node scripts/eval-extract/run.mjs --all       # calls production; skips fixtures that already have a 200 response
node scripts/eval-extract/score.mjs           # results/score.md, results/score.json
```

Each run of `run.mjs` costs one Claude call per file and counts against the per-IP limit (15 per 10 min) and the hourly server cap.
