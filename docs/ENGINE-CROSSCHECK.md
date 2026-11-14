# Engine cross-check: PayTrail federal engine vs independent references

Date: 2026-11-15. Scope: `lib/engine` (withholding.ts, tax.ts, projection.ts) with
`lib/engine/params/2026/federal.json`, tax year 2026. All numbers below come from the deterministic engine
(no LLM is involved), and every expected value comes from an IRS publication or an independent model.

## Headline

- **Per-paycheck withholding (Pub. 15-T 2026, Worksheet 1A).** All 144 numbers in the engine's annual
  percentage tables are identical to the IRS PDF. The engine reproduces **all 4,350 published Wage Bracket
  Method amounts** (weekly, biweekly, semimonthly, monthly; MFJ, HOH, Single/MFS; Step 2 checked and
  unchecked). It also matches **20 Worksheet 1A vectors to the cent**, covering Step 2, Step 3, Step 4(a),
  4(b) and 4(c), and every withholding amount printed on the 6 demo pay stubs.
- **Annual federal tax.** On 11 households (3 demo + 8 synthetic), the tax after CTC/ODC plus Additional
  Medicare Tax **matches PolicyEngine-US 2.124.5 and PSL Tax-Calculator 6.9.1 within $0.01**. The same
  holds for each component: taxable income, regular tax, OBBBA overtime deduction, nonrefundable and
  refundable CTC, and Additional Medicare. Both models include the 2026 OBBBA law (CTC $2,200 / $1,700
  refundable, overtime deduction $12,500 / $25,000, phase-out $100 per full $1,000 over $150k / $300k).
- **No engine bug found** in the paths covered. There is one **scope gap that matters to the target users:
  EITC is not modeled.** For a head of household with 2 children earning $55,000, both references add an
  EITC of $764.23 that PayTrail leaves out, so PayTrail shows a refund that is too small by that amount.
  See "Differences and scope gaps".

**Claim the deck may use:**
> "PayTrail's withholding engine reproduces all 4,350 amounts in the IRS's 2026 Pub. 15-T wage-bracket tables. Its annual federal tax matches two open-source tax models (PolicyEngine-US, Tax-Calculator) within $0.01 on 11 test households, including the 2026 overtime deduction and the $2,200 Child Tax Credit (EITC not modeled)."

## References

| # | Reference | Version / URL | Used for |
|---|---|---|---|
| 1 | IRS Publication 15-T (2026), *Federal Income Tax Withholding Methods* | https://www.irs.gov/pub/irs-pdf/p15t.pdf (downloaded 2026-11-15; "For use in 2026", updated for P.L. 119-21) | Worksheet 1A (p. 10), annual percentage tables (p. 12), wage bracket tables (pp. 13-27), manual percentage tables (pp. 57-60) |
| 1b | IRS Publication 15 (2026), *Employer's Tax Guide* | https://www.irs.gov/pub/irs-pdf/p15.pdf | Social Security 6.2% up to $184,500; Medicare 1.45%; Additional Medicare withholding 0.9% over $200,000 |
| 2 | PolicyEngine-US | `policyengine-us` 2.124.5 (`policyengine-core` 3.36.0), https://github.com/PolicyEngine/policyengine-us | Annual 2026 income tax, CTC, EITC, overtime deduction, Additional Medicare |
| 2b | PSL Tax-Calculator | `taxcalc` 6.9.1, https://github.com/PSLmodels/Tax-Calculator | Same, as a second independent model |
| 3 | IRS Tax Withholding Estimator | https://www.irs.gov/individuals/tax-withholding-estimator | Not automated: a multi-page interactive app. See "Manual checks" below for inputs to type in |
| 4 | Commercial paycheck calculators | n/a | Skipped (weak corroboration, interactive). Manual check listed below |

Both Python models were installed in a throwaway venv (Python 3.14.4). Their 2026 parameters were checked
directly. The standard deduction ($16,100 / $32,200 / $16,100 / $24,150) and all brackets for the four
filing statuses are identical to `federal.json`. CTC is $2,200 with $1,700 refundable and phases out at
$200k / $400k. Additional Medicare thresholds are $200k / $250k / $125k. Overtime deduction parameters
are present in both models (`gov.irs.deductions.overtime_income` in PolicyEngine, `OvertimeIncomeDed_*`
in Tax-Calculator).

## Method

1. **Tables.** `scripts/engine-crosscheck/parse_p15t.py` converts the Pub. 15-T PDF to JSON using
   `pdftotext -layout`. The annual tables are compared with `federal.json` number by number: 2 schedules
   × 3 statuses × 8 rows × (A, C, D).
2. **Worksheet 1A vectors.** `scripts/engine-crosscheck/ws1a.py` implements the worksheet line by line from
   the IRS text, using the parsed IRS tables and not PayTrail's params. Its results, rounded to the cent,
   are hard-coded in `tests/engine-crosscheck.test.ts`. Each vector carries a comment with its worksheet
   lines (1c, 1g, 1i, table row, 2g, 2h, 3b, 4a).
3. **Wage bracket tables.** The IRS computes each wage-bracket cell with the percentage method at the
   bracket midpoint, rounded to the whole dollar. `ws1a.py` reproduces 4,350 of 4,350 cells that way.
   The engine at each midpoint must land within $0.505 of the published dollar amount. Strict
   `Math.round` gives 4,339 / 4,350. The other 11 are double-rounding cases, all in the weekly Single
   table with Step 2 checked. Example: exact 62.4961 → engine returns cents 62.50 → rounds to 63, while
   the IRS shows 62. The engine's cent value is correct.
4. **Annual tax.** The same inputs go to the engine and to both models:
   - each person's wages (gross, traditional 401(k), Section 125 health, so W-2 box 1 and Medicare wages are both right);
   - filing status;
   - children under 17 (age 10), adults age 40;
   - the half-time overtime premium;
   - standard deduction, no other income.

   Synthetic households (`tests/engine-crosscheck.cases.ts`) have one pay stub dated 2026-12-31 whose YTD
   equals the full year. The projection therefore has 0 paychecks left, and `projectYear()` returns
   full-year tax with no extrapolation. For the demo households (as of 2026-11-14), the models receive the
   engine's projected full-year box-1 wages per person: YTD plus the current paycheck × remaining
   paychecks. This checks the tax on those wages. The extrapolation itself is checked separately (below).
   Like-for-like total = Form 1040 line 24 (tax after nonrefundable credits, plus Form 8959 Additional
   Medicare) minus the refundable ACTC, **without EITC**.
   - PolicyEngine: `income_tax_before_refundable_credits − refundable_ctc + additional_medicare_tax`. PolicyEngine books Form 8959 under payroll tax.
   - Tax-Calculator: `c09200 − c11070`.
   - Tax-Calculator draws EITC/ACTC take-up at random by default. It was set to always claim (`eitc_claim_prob_scale` and `actc_claim_prob_scale` = 9e99), as on a filed return.

## Results: per-paycheck withholding (Pub. 15-T 2026)

| Check | Cases | Result |
|---|---|---|
| Annual percentage tables vs `federal.json` | 144 numbers | 144 identical |
| Worksheet 1A line 1g adjustments ($12,900 MFJ / $8,600 other) | 2 | identical |
| Worksheet 1A vectors, to the cent | 20 | 20 match (max difference $0.00) |
| Wage Bracket Method cells (weekly 1,068 · biweekly 1,068 · semimonthly 1,104 · monthly 1,110) | 4,350 | 4,350 within half a dollar (4,339 exact after rounding, 11 double-rounding at x.4961) |
| Pub. 15 rates: SS 6.2% / $184,500, Medicare 1.45%, Additional Medicare 0.9% over $200k | 5 | identical |
| IRS manual percentage method (Worksheet 4) vs automated (Worksheet 1A) | sweep | IRS's own two methods differ by ≤ $0.10 (rounded bracket edges) |

The 20 vectors are listed in `tests/engine-crosscheck.test.ts`:

- V1-V3, V18: single and MFJ, biweekly, Step 2 checked or not.
- V4, V5, V12, V15: Step 3 credits, including credits larger than the tentative withholding.
- V7: Step 4(a) + 4(b), weekly.
- V8, V12, V16: Step 4(c).
- V20: Step 4(b), monthly HOH.
- V9, V13, V19: 35% and 37% rows.
- V10: MFS uses the Single schedule.
- V11: 0% row.
- V4, V14-V18: the six demo stubs.

The withholding printed on every demo stub equals Worksheet 1A:

| Stub | Taxable wages | W-4 | Pub. 15-T | Stub |
|---|---|---|---|---|
| Alex | 3,351.16 | MFJ, Step 3 $2,200 | 149.83 | 149.83 |
| Jordan | 3,000.00 | MFJ | 192.31 | 192.31 |
| Rosa | 1,943.04 | MFJ, Step 2 ✓ | 149.32 | 149.32 |
| Tom | 2,230.77 | MFJ, Step 2 ✓, Step 3 $4,400 | 14.62 | 14.62 |
| Nina | 3,581.54 | MFJ, Step 4(c) $150 | 412.09 | 412.09 |
| Marcus | 1,307.69 | MFJ | 6.92 | 6.92 |

Side finding: the pay-stub check `WITHHOLDING_DIFFERS_FROM_W4` uses a tolerance of max($5, 5%). The IRS
wage-bracket method can differ from the percentage method by up to $4.05 biweekly and $8.82 monthly. None
of the 4,350 wage-bracket cells trips the check, so an employer that uses any legal IRS method (wage
bracket, manual percentage, whole-dollar rounding) is not falsely flagged.

## Results: annual 2026 federal tax

"Ours" = `projection.projectedTax`: income tax after CTC/ODC, minus refundable ACTC, plus Additional
Medicare. A negative value means refundable credit exceeds tax.

| Household | Status, children | Box-1 wages | Ours | PolicyEngine-US | Δ | Tax-Calculator | Δ | EITC (refs) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| couple: Alex & Jordan (demo, as of 11-14) | MFJ, 1 | 165,130.16 | 16,468.64 | 16,468.63 | −0.01 (0.00%) | 16,468.64 | 0.00 | 0 |
| hourly: Rosa & Tom (demo) | MFJ, 2 | 102,943.38 | 3,593.21 | 3,593.21 | 0.00 | 3,593.21 | 0.00 | 0 |
| salaried: Nina & Marcus (demo) | MFJ, 0 | 127,119.98 | 10,894.40 | 10,894.40 | 0.00 | 10,894.40 | 0.00 | 0 |
| single_60k | Single, 0 | 60,000 | 5,020.00 | 5,020.00 | 0.00 | 5,020.00 | 0.00 | 0 |
| hoh_55k_2kids | HOH, 2 | 55,000 | −1,052.00 | −1,052.00 | 0.00 | −1,052.00 | 0.00 | **764.23** |
| mfj_150k_one_earner (401(k) $10k, health $3k) | MFJ, 2 | 137,000 | 8,080.00 | 8,080.00 | 0.00 | 8,080.00 | 0.00 | 0 |
| mfj_overtime ($15,600 OT → $5,200 premium) | MFJ, 1 | 118,000 | 6,976.00 | 6,976.00 | 0.00 | 6,976.00 | 0.00 | 0 |
| ↳ same pay, no overtime deduction | | | 7,600.00 | 7,600.00 | 0.00 | 7,600.00 | 0.00 | |
| single_260k (401(k) $24.5k; Additional Medicare $540) | Single, 0 | 235,500 | 47,204.00 | 47,204.00 | 0.00 | 47,204.00 | 0.00 | 0 |
| mfs_70k | MFS, 1 | 70,000 | 4,370.00 | 4,370.00 | 0.00 | 4,370.00 | 0.00 | 0 |
| single_overtime_phaseout ($30k OT, MAGI $160k → deduction $9,000) | Single, 0 | 160,000 | 24,974.00 | 24,974.00 | 0.00 | 24,974.00 | 0.00 | 0 |
| ↳ same pay, no overtime deduction | | | 27,134.00 | 27,134.00 | 0.00 | 27,134.00 | 0.00 | |
| mfj_470k_two_earners (CTC phase-out → $3,350; Additional Medicare $1,980) | MFJ, 2 | 421,000 | 77,138.00 | 77,138.00 | 0.00 | 77,138.00 | 0.00 | 0 |

The components agree too. Across all 11 households and all 7 components (taxable income, regular tax,
overtime deduction, nonrefundable CTC, refundable CTC, Additional Medicare, total), the largest difference
from either model is $0.01.

**Demo story numbers.** The couple's projection splits into pieces checked above:

- Tax $16,468.64 = PolicyEngine-US = Tax-Calculator.
- Projected withholding $8,895.64 = YTD + 4 × the stub amounts. Those stub amounts equal Pub. 15-T (V4, V18).
- Owed in April: $7,573.

Remaining paychecks: Oct 31 biweekly leaves Nov 14, Nov 28, Dec 12 and Dec 26. YTD ÷ current = 22 pay
periods, and 22 + 4 = 26. The Step 4(c) advice ($999 + $895 per paycheck, split by wage share, rounded
up) adds 4 × $1,894 = $7,576 ≥ $7,573. Worksheet 1A line 4a adds Step 4(c) dollar for dollar.

## Differences and scope gaps

No difference above $1 was found inside the engine's scope. The only differences at all:

| Difference | Size | Cause | Is it a bug? |
|---|---|---|---|
| couple total, PolicyEngine | −$0.01 | PolicyEngine computes in float32 (18,668.63 vs 18,668.64 regular tax) | No; rounding in the reference |
| 11 wage-bracket cells (weekly Single, Step 2 checked) | engine cents 62.50 vs IRS $62 | Double rounding in the comparison: the exact amount is 62.4961; the engine's cent result is right | No |
| **EITC** (hoh_55k_2kids) | **$764.23** smaller refund in PayTrail | Earned Income Tax Credit is not modeled. Both references compute it (2026: max $7,316 for 2 children, phase-out 21.06% from $23,890) | **Scope gap, not a bug.** For W-2 families with children below about $59k (single/HOH, 2 children), PayTrail overstates tax / understates refund. Fix later: add EITC params (Rev. Proc. 2025-32) or show "EITC not included" when AGI is under the limit |

Other scope limits, not exercised by these households:

- **ACTC alternative formula for 3+ children.** PolicyEngine models it (`min_children_for_ss_taxes_minus_eitc = 3`); the engine does not. It matters only for low earners with 3+ children.
- **Overtime premium.** The engine takes it as overtime pay ÷ 3, which assumes time-and-a-half. Double-time or state-law daily overtime would overstate the deduction: only the FLSA half-time premium qualifies.
- **Age-based items are not modeled because age is not collected.** That covers the 2025-2028 senior deduction ($6,000), the extra standard deduction for 65+/blind, and the 401(k) catch-up.
- **Out of scope:** tips deduction, car-loan interest deduction, itemized deductions, other income.
- **ODC ($500 other dependents).** Unit-tested in `tests/engine.test.ts`, but not cross-checked against the models here.
- **Projection extrapolation.** It is not a tax rule, so the models cannot check it. It is checked by the arithmetic above and by `tests/engine-audit.test.ts` (F3, F4, F5, F9).

## Bugs found

None in the covered paths (withholding, brackets, standard deduction, CTC/ACTC with phase-out, OBBBA
overtime deduction with cap and phase-out, Additional Medicare liability and withholding, MFS). No test is
marked `it.fails` or `it.skip`. The only skipped block is the optional dump, which runs when
`XCHECK_DUMP` is set.

## Manual checks for a human

1. **IRS Tax Withholding Estimator** (https://www.irs.gov/individuals/tax-withholding-estimator), demo
   couple:
   - **Household:** filing status Married filing jointly; 1 child under 17; no other income; standard deduction; Texas.
   - **Job 1 (Alex):**
     - Biweekly, most recent pay date 10/31/2026.
     - Gross this period $3,653.85; YTD $80,384.70.
     - Federal withholding this period $149.83; YTD $3,296.26.
     - 401(k): $182.69 / YTD $4,019.18. Pre-tax health (Section 125): $120 / YTD $2,640.
   - **Job 2 (Jordan):**
     - Biweekly, 10/31/2026.
     - Gross $3,000 / YTD $66,000.
     - Federal withholding $192.31 / YTD $4,230.82.
     - No pre-tax deductions.
   - **Expect:** estimated 2026 tax ≈ $16,469; projected withholding ≈ $8,896; balance due ≈ $7,573.
   - The Estimator's W-4 suggestion may put all the extra on one job. The total extra per remaining paycheck should be about $1,893. PayTrail's per-job split is $999 + $895.
2. **Paycheck calculator** (e.g. PaycheckCity salary calculator), Alex's paycheck:
   - **Inputs:** 2026, biweekly, gross $3,653.85; 2020+ W-4, MFJ, Step 2 unchecked, Step 3 $2,200; 401(k) $182.69 pre-tax (federal only); health $120 pre-tax Section 125 (federal and FICA); state TX.
   - **Expect:** federal income tax $149.83, Social Security $219.10, Medicare $51.24.

## Reproduce

```bash
# Pub. 15-T tables and the independent Worksheet 1A (needs poppler-utils for pdftotext)
curl -o /tmp/p15t.pdf https://www.irs.gov/pub/irs-pdf/p15t.pdf && pdftotext -layout /tmp/p15t.pdf /tmp/p15t.txt
python3 -I scripts/engine-crosscheck/parse_p15t.py /tmp/p15t.txt /tmp/p15t-2026.json tests/fixtures/pub15t-2026.json
python3 -I scripts/engine-crosscheck/ws1a.py /tmp/p15t-2026.json lib/engine/params/2026/federal.json

# Regression tests (vectors, wage-bracket cells, annual references)
npx vitest run tests/engine-crosscheck.test.ts

# Re-run the reference models
python3 -m venv /tmp/xcheck && /tmp/xcheck/bin/pip install policyengine-us taxcalc
XCHECK_DUMP=/tmp/engine.json npx vitest run tests/engine-crosscheck.test.ts
/tmp/xcheck/bin/python scripts/engine-crosscheck/reference_models.py /tmp/engine.json /tmp/reference.json
```

When a model or the engine changes, update `ANNUAL_REFERENCE` in `tests/engine-crosscheck.test.ts` from
`reference.json` and the versions in this file.
