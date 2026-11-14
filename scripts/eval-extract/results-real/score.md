Documents scored: 2. documentType correct: 2/2. HTTP errors: 0. Docs with schema warnings: 0.

**Fields read exactly: 20 / 20 (100.0%)**. Of these fields, 0 have an expected value of null (not printed, e.g. rate on a salaried stub).

| Group | Docs | Fields | Exact | % |
|---|---:|---:|---:|---:|
| All documents | 2 | 20 | 20 | 100.0% |
| PDF only | 1 | 10 | 10 | 100.0% |
| PNG only | 1 | 10 | 10 | 100.0% |
| Pay stubs (PDF+PNG) | 0 | 0 | 0 | n/a |
| W-2s (PDF+PNG) | 2 | 20 | 20 | 100.0% |

### Per document

| Document | Layout | Type | HTTP | Latency | documentType | Fields | Exact | % | Flagged uncertain | Warnings |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| official_w2_jordan | IRS W-2 2026 Copy B (filled, flattened) | PDF | 200 | 10.7 s | ok | 10 | 10 | 100.0% | 0 | 0 |
| official_w2_jordan_photo | IRS W-2 2026 Copy B (photo-like PNG) | PNG | 200 | 5.7 s | ok | 10 | 10 | 100.0% | 0 | 0 |

### Per field category

| Category | Fields | Exact | % |
|---|---:|---:|---:|
| Dates, tax year, pay frequency | 2 | 2 | 100.0% |
| Employer name | 2 | 2 | 100.0% |
| Booleans (pre-tax, box 13) | 2 | 2 | 100.0% |
| W-2 money boxes (1–6, 12, 16–17) | 14 | 14 | 100.0% |

Employer names counted correct only because the "(SAMPLE)" suffix was dropped: 0.

### Every mismatch (0)

None.

### Fields the model flagged as uncertain (0)

None.

Mismatches that were flagged uncertain: 0 of 0.

### Not scored (ambiguous ground truth)

None.

### Lines matched through an alternative accepted type

None.
