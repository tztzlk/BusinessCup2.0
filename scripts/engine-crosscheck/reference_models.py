"""Annual 2026 federal tax for the PayTrail cross-check households in two independent open-source models:
PolicyEngine-US and PSL Tax-Calculator (taxcalc). Reads the engine dump written by
tests/engine-crosscheck.test.ts (XCHECK_DUMP=<file>) and prints/writes a comparison.

Usage (inside a venv with `pip install policyengine-us taxcalc`):
  python reference_models.py <engine.json> <results.json>

Both models get identical inputs: each person's wages after pre-tax 401(k)/Section 125 (W-2 box 1),
401(k) and Section 125 separately so payroll-tax wages are right, filing status, children under 17
(age 10), adults age 40, the half-time overtime premium, standard deduction, no other income.
Totals compared: income tax after CTC/ODC, minus refundable ACTC and EITC, plus Additional Medicare Tax.
"""
import json
import sys
import importlib.metadata as md

YEAR = 2026
cases = json.load(open(sys.argv[1]))
out_path = sys.argv[2]

PE_STATUS = {"single": "SINGLE", "married_joint": "JOINT", "married_separate": "SEPARATE", "head_of_household": "HEAD_OF_HOUSEHOLD"}
TC_MARS = {"single": 1, "married_joint": 2, "married_separate": 3, "head_of_household": 4}


def policyengine(case, with_overtime=True):
    from policyengine_us import Simulation

    people, members = {}, []
    for m, w in case["people"].items():
        name = "you" if m == "self" else "spouse"
        people[name] = {
            "age": {YEAR: 40},
            # employment_income is gross; PE subtracts pre_tax_contributions for income tax (IRC 402(g), 125).
            "employment_income": {YEAR: w["gross"]},
            "traditional_401k_contributions": {YEAR: w["k401"]},
            "pre_tax_health_insurance_premiums": {YEAR: w["health"]},
            "fsla_overtime_premium": {YEAR: w["otPremium"] if with_overtime else 0},
        }
        members.append(name)
    if case["profile"]["filingStatus"] == "married_joint" and "spouse" not in people:
        people["spouse"] = {"age": {YEAR: 40}, "employment_income": {YEAR: 0}}
        members.append("spouse")
    for i in range(case["profile"]["dependentsUnder17"]):
        people[f"child{i}"] = {"age": {YEAR: 10}, "is_tax_unit_dependent": {YEAR: True}}
        members.append(f"child{i}")
    situation = {
        "people": people,
        "tax_units": {"tu": {"members": members, "filing_status": {YEAR: PE_STATUS[case["profile"]["filingStatus"]]}}},
        "spm_units": {"spm": {"members": members}},
        "families": {"f": {"members": members}},
        "marital_units": {},
        "households": {"h": {"members": members, "state_code": {YEAR: "TX"}}},
    }
    # Marital units: spouses together, everyone else alone.
    adults = [n for n in ("you", "spouse") if n in people]
    if case["profile"]["filingStatus"] in ("married_joint", "married_separate") and len(adults) == 2:
        situation["marital_units"]["mu"] = {"members": adults}
    else:
        situation["marital_units"]["mu"] = {"members": ["you"]}
    for n in members:
        if not any(n in mu["members"] for mu in situation["marital_units"].values()):
            situation["marital_units"][f"mu_{n}"] = {"members": [n]}
    if case["profile"]["filingStatus"] == "married_separate":
        # A separate return: only "you" and the child are in the tax unit.
        pass
    sim = Simulation(situation=situation)
    g = lambda v: float(sim.calculate(v, YEAR).sum())
    return {
        "agi": g("adjusted_gross_income"),
        "overtimeDeduction": g("overtime_income_deduction"),
        "taxableIncome": g("taxable_income"),
        "regularTax": g("income_tax_main_rates"),
        "incomeTaxBeforeCredits": g("income_tax_before_credits"),
        "ctcNonRefundable": g("non_refundable_ctc"),
        "ctcRefundable": g("refundable_ctc"),
        "eitc": g("eitc"),
        "additionalMedicare": g("additional_medicare_tax"),
        "incomeTaxBeforeRefundableCredits": g("income_tax_before_refundable_credits"),
        "incomeTax": g("income_tax"),  # after all refundable credits incl. EITC; excludes Additional Medicare
    }


def taxcalc_run(case, with_overtime=True):
    import pandas as pd
    import taxcalc as tc

    st = case["profile"]["filingStatus"]
    p = case["people"]
    you, sp = p.get("self"), p.get("spouse")
    box1 = lambda w: w["gross"] - w["k401"] - w["health"] if w else 0.0
    kids = case["profile"]["dependentsUnder17"]
    ot = sum(w["otPremium"] for w in p.values()) if with_overtime else 0
    rec = {
        "RECID": 1, "FLPDYR": YEAR, "MARS": TC_MARS[st],
        "XTOT": (2 if st == "married_joint" else 1) + kids,
        "n24": kids, "nu18": kids, "EIC": min(kids, 3),
        "age_head": 40, "age_spouse": 40 if st == "married_joint" else 0,
        # e00200 is wages net of pension contributions (box 1); Section 125 health is excluded
        # from both box 1 and payroll wages, so it is simply left out of e00200 and pencon.
        "e00200p": box1(you), "e00200s": box1(sp), "e00200": box1(you) + box1(sp),
        "pencon_p": you["k401"] if you else 0.0, "pencon_s": sp["k401"] if sp else 0.0,
        "overtime_income": ot,
    }
    recs = tc.Records(data=pd.DataFrame([rec]), start_year=YEAR, gfactors=None, weights=None, adjust_ratios=None)
    # Tax-Calculator 6.x models EITC/ACTC take-up with a random draw (credit_claim_urn vs a claim
    # probability); a scale of 9e99 means "always claim", as on a filed return.
    pol = tc.Policy()
    pol.implement_reform({"eitc_claim_prob_scale": {YEAR: 9e99}, "actc_claim_prob_scale": {YEAR: 9e99}})
    calc = tc.Calculator(policy=pol, records=recs)
    calc.calc_all()
    g = lambda v: float(calc.array(v)[0])
    return {
        "agi": g("c00100"),
        "overtimeDeduction": g("overtime_income_deduction"),
        "taxableIncome": g("c04800"),
        "regularTax": g("taxbc"),
        "ctcNonRefundable": g("c07220"),
        "ctcRefundable": g("c11070"),
        "odc": g("odc"),
        "eitc": g("eitc"),
        "additionalMedicare": g("ptax_amc"),
        "totalTaxBeforeRefundable": g("c09200"),  # Form 1040 line 24: tax after nonrefundable credits + Sch 2 other taxes (incl. Form 8959)
        "iitax": g("iitax"),  # net of all refundable items incl. EITC and Form 8959 Part V withholding credit
    }


def ours(case):
    i = case["projection"]["inputs"]
    return {
        "agi": i["agi"],
        "overtimeDeduction": i["overtimeDeduction"],
        "taxableIncome": i["taxableIncome"],
        "regularTax": i["regularTax"],
        "ctcNonRefundable": i["childCreditsNonRefundable"],
        "ctcRefundable": i["childCreditsRefundable"],
        "additionalMedicare": i["additionalMedicareLiability"],
        "eitc": i.get("earnedIncomeCredit", 0),
        "projectedTax": case["projection"]["projectedTax"],  # includes Additional Medicare and EITC
    }


results = {
    "versions": {"policyengine-us": md.version("policyengine-us"), "policyengine-core": md.version("policyengine-core"), "taxcalc": md.version("taxcalc")},
    "cases": [],
}
for c in cases:
    o = ours(c)
    pe = policyengine(c)
    tcr = taxcalc_run(c)
    row = {"name": c["name"], "ours": o, "policyengine": pe, "taxcalc": tcr}
    # Like-for-like totals: our projectedTax = income tax after CTC/ODC - ACTC - EITC + Additional Medicare.
    row["compare"] = {
        "ours": o["projectedTax"],
        # PE: Form 1040 line 24 without Additional Medicare (PE books it as payroll tax) - ACTC - EITC + Form 8959.
        "policyengine": round(pe["incomeTaxBeforeRefundableCredits"] - pe["ctcRefundable"] - pe["eitc"] + pe["additionalMedicare"], 2),
        # TC: Form 1040 line 24 (includes Form 8959) - ACTC - EITC.
        "taxcalc": round(tcr["totalTaxBeforeRefundable"] - tcr["ctcRefundable"] - tcr["eitc"], 2),
        "eitc_ours": o["eitc"],
        "eitc_pe": pe["eitc"],
        "eitc_tc": tcr["eitc"],
    }
    if any(w["otPremium"] > 0 for w in c["people"].values()):
        pe0, tc0 = policyengine(c, with_overtime=False), taxcalc_run(c, with_overtime=False)
        row["withoutOvertimeDeduction"] = {
            "ours": c.get("projectionNoOvertime", {}).get("projectedTax"),
            "policyengine": round(pe0["incomeTaxBeforeRefundableCredits"] - pe0["ctcRefundable"] - pe0["eitc"] + pe0["additionalMedicare"], 2),
            "taxcalc": round(tc0["totalTaxBeforeRefundable"] - tc0["ctcRefundable"] - tc0["eitc"], 2),
        }
    results["cases"].append(row)
    cmp = row["compare"]
    print(f'{c["name"]:28s} ours {cmp["ours"]:>10.2f}  PE {cmp["policyengine"]:>10.2f} ({cmp["policyengine"]-cmp["ours"]:+.2f})  '
          f'TC {cmp["taxcalc"]:>10.2f} ({cmp["taxcalc"]-cmp["ours"]:+.2f})  EITC ours {o["eitc"]:.2f} pe {pe["eitc"]:.2f} tc {tcr["eitc"]:.2f}'
          + (f'  noOT: {row["withoutOvertimeDeduction"]}' if "withoutOvertimeDeduction" in row else ""))
json.dump(results, open(out_path, "w"), indent=1)
print(json.dumps(results["versions"]))
