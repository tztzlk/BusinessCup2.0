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
- **Annual federal tax.** On 18 households (3 demo + 15 synthetic, 7 of them EITC cases), the tax after
  CTC/ODC, refundable ACTC and EITC, plus Additional Medicare Tax, **matches PolicyEngine-US 2.124.5 on 18
  of 18 and PSL Tax-Calculator 6.9.1 on 17 of 18 within $0.01**. The one Tax-Calculator difference is by
  design: for married filing separately it assumes the separated-spouse EITC exception applies (see
  "Differences"). The same holds for each component: taxable income, regular tax, OBBBA overtime deduction,
  nonrefundable and refundable CTC, EITC, and Additional Medicare (for 4 low earners the nonrefundable CTC
  is compared with Tax-Calculator only, because PolicyEngine reports it before the tax limit; see below). Both models include the 2026 OBBBA law
  (CTC $2,200 / $1,700 refundable, overtime deduction $12,500 / $25,000, phase-out $100 per full $1,000
  over $150k / $300k).
- **EITC is now modeled** (`earnedIncomeCredit()` in `lib/engine/tax.ts`, parameters from Rev. Proc. 2025-32
  section 4.06 and IRC 32(b)(1)). The earlier gap, head of household with 2 children at $55,000, now
  matches both models: EITC $764.23, total −$1,816.23 (was −$1,052.00 without EITC).
- **No engine bug found** in the paths covered.

**Claim the deck may use:**
> "PayTrail's withholding engine reproduces all 4,350 amounts in the IRS's 2026 Pub. 15-T wage-bracket tables. Its annual federal tax matches the open-source tax model PolicyEngine-US within $0.01 on 18 of 18 test households, and Tax-Calculator on 17 of 18 (the other differs by design), including the 2026 overtime deduction, the $2,200 Child Tax Credit and the Earned Income Tax Credit."

## References

| # | Reference | Version / URL | Used for |
|---|---|---|---|
| 1 | IRS Publication 15-T (2026), *Federal Income Tax Withholding Methods* | https://www.irs.gov/pub/irs-pdf/p15t.pdf (downloaded 2026-11-15; "For use in 2026", updated for P.L. 119-21) | Worksheet 1A (p. 10), annual percentage tables (p. 12), wage bracket tables (pp. 13-27), manual percentage tables (pp. 57-60) |
| 1b | IRS Publication 15 (2026), *Employer's Tax Guide* | https://www.irs.gov/pub/irs-pdf/p15.pdf | Social Security 6.2% up to $184,500; Medicare 1.45%; Additional Medicare withholding 0.9% over $200,000 |
| 1c | IRS Rev. Proc. 2025-32 | https://www.irs.gov/pub/irs-drop/rp-25-32.pdf, section 4.06(1) table and 4.06(2), pp. 14-15 | 2026 EITC amounts: earned income amount, maximum credit, threshold and completed phaseout (MFJ and other), investment income limit $12,200 |
| 1d | 26 U.S.C. § 32 | https://www.law.cornell.edu/uscode/text/26/32 | EITC credit and phaseout percentages (subsection (b)(1)); joint-return rule (d)(1) and separated-spouse exception (d)(2)(B) |
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
   Medicare) minus the refundable ACTC and the EITC.
   - PolicyEngine: `income_tax_before_refundable_credits − refundable_ctc − eitc + additional_medicare_tax`. PolicyEngine books Form 8959 under payroll tax.
   - Tax-Calculator: `c09200 − c11070 − eitc`.
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

"Ours" = `projection.projectedTax`: income tax after CTC/ODC, minus refundable ACTC and EITC, plus
Additional Medicare. A negative value means refundable credits exceed tax. EITC column: ours = PolicyEngine
= Tax-Calculator unless noted.

| Household | Status, children | Box-1 wages | Ours | PolicyEngine-US | Δ | Tax-Calculator | Δ | EITC |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| couple: Alex & Jordan (demo, as of 11-14) | MFJ, 1 | 165,130.16 | 16,468.64 | 16,468.63 | −0.01 (0.00%) | 16,468.64 | 0.00 | 0 |
| hourly: Rosa & Tom (demo) | MFJ, 2 | 102,943.38 | 3,593.21 | 3,593.21 | 0.00 | 3,593.21 | 0.00 | 0 |
| salaried: Nina & Marcus (demo) | MFJ, 0 | 127,119.98 | 10,894.40 | 10,894.40 | 0.00 | 10,894.40 | 0.00 | 0 |
| single_60k | Single, 0 | 60,000 | 5,020.00 | 5,020.00 | 0.00 | 5,020.00 | 0.00 | 0 |
| hoh_55k_2kids | HOH, 2 | 55,000 | −1,816.23 | −1,816.23 | 0.00 | −1,816.23 | 0.00 | 764.23 |
| mfj_150k_one_earner (401(k) $10k, health $3k) | MFJ, 2 | 137,000 | 8,080.00 | 8,080.00 | 0.00 | 8,080.00 | 0.00 | 0 |
| mfj_overtime ($15,600 OT → $5,200 premium) | MFJ, 1 | 118,000 | 6,976.00 | 6,976.00 | 0.00 | 6,976.00 | 0.00 | 0 |
| ↳ same pay, no overtime deduction | | | 7,600.00 | 7,600.00 | 0.00 | 7,600.00 | 0.00 | |
| single_260k (401(k) $24.5k; Additional Medicare $540) | Single, 0 | 235,500 | 47,204.00 | 47,204.00 | 0.00 | 47,204.00 | 0.00 | 0 |
| mfs_70k | MFS, 1 | 70,000 | 4,370.00 | 4,370.00 | 0.00 | 4,370.00 | 0.00 | 0 |
| single_overtime_phaseout ($30k OT, MAGI $160k → deduction $9,000) | Single, 0 | 160,000 | 24,974.00 | 24,974.00 | 0.00 | 24,974.00 | 0.00 | 0 |
| ↳ same pay, no overtime deduction | | | 27,134.00 | 27,134.00 | 0.00 | 27,134.00 | 0.00 | |
| mfj_470k_two_earners (CTC phase-out → $3,350; Additional Medicare $1,980) | MFJ, 2 | 421,000 | 77,138.00 | 77,138.00 | 0.00 | 77,138.00 | 0.00 | 0 |
| single_15k_eitc (no-child EITC, phase-out) | Single, 0 | 15,000 | −347.29 | −347.29 | 0.00 | −347.29 | 0.00 | 347.29 |
| hoh_10k_1kid_eitc (phase-in: 34% × 10,000) | HOH, 1 | 10,000 | −4,525.00 | −4,525.00 | 0.00 | −4,525.00 | 0.00 | 3,400.00 |
| hoh_25k_1kid_eitc (just past the plateau) | HOH, 1 | 25,000 | −5,949.62 | −5,949.62 | 0.00 | −5,949.62 | 0.00 | 4,249.62 |
| mfj_40k_3kids_eitc (one earner, joint threshold) | MFJ, 3 | 40,000 | −11,469.30 | −11,469.30 | 0.00 | −11,469.30 | 0.00 | 6,369.30 |
| mfj_65k_2kids_eitc ($40k + $25k, near the end of the phase-out) | MFJ, 2 | 65,000 | −1,149.30 | −1,149.30 | 0.00 | −1,149.30 | 0.00 | 189.30 |
| hoh_59k_2kids_eitc_end (above the $58,629 completed phaseout) | HOH, 2 | 59,000 | −572.00 | −572.00 | 0.00 | −572.00 | 0.00 | 0 |
| mfs_20k_1kid_eitc (MFS: no EITC, IRC 32(d)(1)) | MFS, 1 | 20,000 | −1,700.00 | −1,700.00 | 0.00 | −6,127.00 | −4,427.00 | 0 (TC: 4,427) |

EITC hand checks (Rev. Proc. 2025-32 sec. 4.06(1) amounts, IRC 32(b)(1) rates; credit =
min(phase-in, max − phaseout rate × (max(AGI, earned income) − threshold)), 0 at or above the completed
phaseout):

- hoh_55k_2kids: 7,316 − 21.06% × (55,000 − 23,890) = 764.23.
- single_15k: min(7.65% × 15,000, 664) = 664; 664 − 7.65% × (15,000 − 10,860) = 347.29.
- hoh_10k_1kid: 34% × 10,000 = 3,400 (below the 13,020 earned income amount and the 23,890 threshold).
- hoh_25k_1kid: 4,427 − 15.98% × (25,000 − 23,890) = 4,249.62.
- mfj_40k_3kids: 8,231 − 21.06% × (40,000 − 31,160) = 6,369.30.
- mfj_65k_2kids: 7,316 − 21.06% × (65,000 − 31,160) = 189.30.
- hoh_59k_2kids: 59,000 ≥ 58,629 → 0.

The components agree too. Across all 18 households and all 8 components (taxable income, regular tax,
overtime deduction, nonrefundable CTC, refundable CTC, EITC, Additional Medicare, total), the largest
difference is $0.01, apart from the MFS EITC difference below. For low earners whose tax is below the
credit (hoh_10k, hoh_25k, mfj_40k, mfs_20k), the nonrefundable CTC is compared with Tax-Calculator's `c07220`
(the amount used against tax, Form 1040 line 19): PolicyEngine's `non_refundable_ctc` is the nonrefundable
portion before the tax limit. Both models' totals agree with ours.

**Demo story numbers.** The couple's projection splits into pieces checked above:

- Tax $16,468.64 = PolicyEngine-US = Tax-Calculator.
- Projected withholding $8,895.64 = YTD + 4 × the stub amounts. Those stub amounts equal Pub. 15-T (V4, V18).
- Owed in April: $7,573.

Remaining paychecks: Oct 31 biweekly leaves Nov 14, Nov 28, Dec 12 and Dec 26. YTD ÷ current = 22 pay
periods, and 22 + 4 = 26. The Step 4(c) advice ($999 + $895 per paycheck, split by wage share, rounded
up) adds 4 × $1,894 = $7,576 ≥ $7,573. Worksheet 1A line 4a adds Step 4(c) dollar for dollar.

## Differences and scope gaps

No difference above $1 was found inside the engine's scope, except one by-design EITC difference with
Tax-Calculator. All differences:

| Difference | Size | Cause | Is it a bug? |
|---|---|---|---|
| couple total, PolicyEngine | −$0.01 | PolicyEngine computes in float32 (18,668.63 vs 18,668.64 regular tax) | No; rounding in the reference |
| 11 wage-bracket cells (weekly Single, Step 2 checked) | engine cents 62.50 vs IRS $62 | Double rounding in the comparison: the exact amount is 62.4961; the engine's cent result is right | No |
| mfs_20k_1kid_eitc, Tax-Calculator | −$4,427.00 (TC adds EITC $4,427) | Tax-Calculator sets `EITC_sep_filers_elig = true` from 2021 and assumes every MFS filer with a child meets the IRC 32(d)(2)(B) separated-spouse exception (lived apart for the last 6 months of the year, or a separation agreement). PolicyEngine and PayTrail apply the general rule, IRC 32(d)(1): no EITC unless filing jointly | No. PayTrail doesn't collect whether the spouses lived apart, so it follows the general rule. Listed as a limitation |
| ~~EITC not modeled~~ (hoh_55k_2kids) | was $764.23 | Fixed: EITC added from Rev. Proc. 2025-32 sec. 4.06 | Resolved; now matches both models |

Other scope limits, not exercised by these households:

- **EITC simplifications.** Qualifying children = children under 17 from the profile; the EITC also counts
  children aged 17-18 and full-time students under 24 (IRC 152(c)(3)), so for them PayTrail understates the
  credit. Investment income is not modeled (assumed ≤ $12,200, IRC 32(i)). The no-child credit needs age
  25-64, which is assumed (age is not collected). Married filing separately gets no EITC (the separated-spouse
  exception is not modeled). The engine uses the exact formula; a filed return reads the IRS EIC table with
  $50 income bands, so the return can differ by a few dollars.
- **ACTC alternative formula for 3+ children.** PolicyEngine models it (`min_children_for_ss_taxes_minus_eitc = 3`); the engine does not. It matters only for low earners with 3+ children.
- **Overtime premium.** The engine takes it as overtime pay ÷ 3, which assumes time-and-a-half. Double-time or state-law daily overtime would overstate the deduction: only the FLSA half-time premium qualifies.
- **Age-based items are not modeled because age is not collected.** That covers the 2025-2028 senior deduction ($6,000), the extra standard deduction for 65+/blind, and the 401(k) catch-up.
- **Out of scope:** tips deduction, car-loan interest deduction, itemized deductions, other income.
- **ODC ($500 other dependents).** Unit-tested in `tests/engine.test.ts`, but not cross-checked against the models here.
- **Projection extrapolation.** It is not a tax rule, so the models cannot check it. It is checked by the arithmetic above and by `tests/engine-audit.test.ts` (F3, F4, F5, F9).

## Bugs found

None in the covered paths (withholding, brackets, standard deduction, CTC/ACTC with phase-out, EITC with
phase-in, plateau, phase-out and the joint threshold, OBBBA overtime deduction with cap and phase-out,
Additional Medicare liability and withholding, MFS). No test is
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
npx vitest run tests/engine-crosscheck.test.ts tests/eitc.test.ts

# Re-run the reference models
python3 -m venv /tmp/xcheck && /tmp/xcheck/bin/pip install policyengine-us taxcalc
XCHECK_DUMP=/tmp/engine.json npx vitest run tests/engine-crosscheck.test.ts
/tmp/xcheck/bin/python scripts/engine-crosscheck/reference_models.py /tmp/engine.json /tmp/reference.json
```

When a model or the engine changes, update `ANNUAL_REFERENCE` in `tests/engine-crosscheck.test.ts` from
`reference.json` and the versions in this file.
