Documents scored: 11. documentType correct: 11/11. HTTP errors: 0. Docs with schema warnings: 0.

**Fields read exactly: 209 / 209 (100.0%)**. Of these fields, 5 have an expected value of null (not printed, e.g. rate on a salaried stub).

| Group | Docs | Fields | Exact | % |
|---|---:|---:|---:|---:|
| All documents | 11 | 209 | 209 | 100.0% |
| PDF only | 9 | 176 | 176 | 100.0% |
| PNG only | 2 | 33 | 33 | 100.0% |
| Pay stubs (PDF+PNG) | 8 | 179 | 179 | 100.0% |
| W-2s (PDF+PNG) | 3 | 30 | 30 | 100.0% |

### Per document

| Document | Layout | Type | HTTP | Latency | documentType | Fields | Exact | % | Flagged uncertain | Warnings |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| couple_doc_alex_1031 | stub-A | PDF | 200 | 5.4 s | ok | 26 | 26 | 100.0% | 0 | 0 |
| couple_doc_jordan_1031 | stub-B | PDF | 200 | 4.5 s | ok | 21 | 21 | 100.0% | 0 | 0 |
| hourly_doc_rosa_1106 | stub-A | PDF | 200 | 5.0 s | ok | 23 | 23 | 100.0% | 0 | 0 |
| hourly_doc_rosa_1106_png | stub-A (PNG) | PNG | 200 | 5.6 s | ok | 23 | 23 | 100.0% | 0 | 0 |
| hourly_doc_tom_1106 | stub-B | PDF | 200 | 5.6 s | ok | 18 | 18 | 100.0% | 0 | 0 |
| salaried_doc_nina_1031 | stub-A | PDF | 200 | 4.7 s | ok | 23 | 23 | 100.0% | 0 | 0 |
| salaried_doc_marcus_1031 | stub-B | PDF | 200 | 4.6 s | ok | 18 | 18 | 100.0% | 0 | 0 |
| couple_doc_alex_1031_w2 | w2 | PDF | 200 | 5.3 s | ok | 10 | 10 | 100.0% | 0 | 0 |
| couple_doc_alex_1031_w2_png | w2 (PNG) | PNG | 200 | 5.0 s | ok | 10 | 10 | 100.0% | 0 | 0 |
| couple_doc_jordan_1031_w2 | w2 | PDF | 200 | 5.0 s | ok | 10 | 10 | 100.0% | 1 | 0 |
| acme_sample_paystub | public sample (text-only) | PDF | 200 | 5.8 s | ok | 27 | 27 | 100.0% | 0 | 0 |

### Per field category

| Category | Fields | Exact | % |
|---|---:|---:|---:|
| Dates, tax year, pay frequency | 35 | 35 | 100.0% |
| Employer name | 11 | 11 | 100.0% |
| Amounts, current period (incl. gross/net) | 61 | 61 | 100.0% |
| Year-to-date amounts | 53 | 53 | 100.0% |
| Hours and rate | 18 | 18 | 100.0% |
| Booleans (pre-tax, box 13) | 10 | 10 | 100.0% |
| W-2 money boxes (1–6, 12, 16–17) | 21 | 21 | 100.0% |

Employer names counted correct only because the "(SAMPLE)" suffix was dropped: 1.

### Every mismatch (0)

None.

### Fields the model flagged as uncertain (1)

- couple_doc_jordan_1031_w2: box6MedicareWithheld (medium)

Mismatches that were flagged uncertain: 0 of 0.
