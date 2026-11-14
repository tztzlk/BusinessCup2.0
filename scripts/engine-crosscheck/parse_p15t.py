"""Parse IRS Pub 15-T (2026) text into JSON: annual percentage tables (section 1), wage bracket
tables for 2020+ Forms W-4 (section 2) and manual percentage tables (section 4).

  curl -o p15t.pdf https://www.irs.gov/pub/irs-pdf/p15t.pdf && pdftotext -layout p15t.pdf p15t.txt
  python3 -I parse_p15t.py p15t.txt p15t-2026.json [../../tests/fixtures/pub15t-2026.json]

The optional third argument rewrites the compact fixture used by tests/engine-crosscheck.test.ts.
"""
import json, re, sys
txt = open(sys.argv[1]).read().split("\n")
out = sys.argv[2]
money = lambda s: float(s.replace("$", "").replace(",", ""))
NUM = r"\$[\d,]+(?:\.\d+)?"

def find(pattern, start=0):
    for i in range(start, len(txt)):
        if re.search(pattern, txt[i]):
            return i
    raise ValueError(pattern)

def pct_table(start):
    """Rows for MFJ, Single, HOH; each row 'A B C D% E   A B C D% E' (B missing on last row)."""
    res = {"standard": {}, "step2Checked": {}}
    keys = ["married_joint", "single", "head_of_household"]
    k = -1
    i = start
    while k < 3 and i < len(txt):
        line = txt[i]
        if re.search(r"Married Filing Jointly\s+Married Filing Jointly|Single or Married Filing Separately\s+Single|Head of Household\s+Head of Household", line):
            k += 1
            if k == 3: break
            res["standard"][keys[k]] = []; res["step2Checked"][keys[k]] = []
        elif k >= 0:
            toks = re.findall(r"\$[\d,]+(?:\.\d+)?|\d+%", line)
            if toks:
                # split into two halves at the percentage tokens
                pidx = [j for j, t in enumerate(toks) if t.endswith("%")]
                if len(pidx) != 2: raise ValueError(line)
                left, right = toks[: pidx[0] + 2], toks[pidx[0] + 2 :]
                def row(t):
                    a = money(t[0]); c = money(t[-3]); d = float(t[-2][:-1]) / 100; e = money(t[-1])
                    assert a == e, t
                    return [a, c, d]
                res["standard"][keys[k]].append(row(left)); res["step2Checked"][keys[k]].append(row(right))
                if len(res["standard"][keys[k]]) == 8 and k == 2: k = 3
        i += 1
    return res

annual_i = find(r"2026 Percentage Method Tables for Automated Payroll")
annual = pct_table(annual_i)

manual = {}
for freq in ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY"]:
    i = find(r"Percentage Method Tables for Manual Payroll Systems With Forms W-4 from 2020", 3400)
    # locate freq header after the manual percentage section start
    j = i
    while not re.search(rf"^\s*{freq} Payroll Period", txt[j]): j += 1
    manual[freq.lower()] = pct_table(j)

# Wage bracket tables, section 2 (2020+ W-4): pages between "Wage Bracket Method Tables for Manual Payroll Systems with Forms W-4 From 2020" lines
wb = {}
sec2_end = find(r"3\. Wage Bracket Method Tables", 900)  # start of section 3 text
for i in range(len(txt)):
    if i >= sec2_end: break
    m = re.search(r"^\s*(WEEKLY|BIWEEKLY|SEMIMONTHLY|MONTHLY|DAILY) Payroll Period", txt[i])
    if m and "Wage Bracket Method Tables for Manual Payroll Systems with Forms W-4 From 2020" in txt[i - 1]:
        freq = m.group(1).lower()
        rows = wb.setdefault(freq, [])
        j = i + 1
        while j < len(txt) and not txt[j].startswith("Publication 15-T") and not re.match(r"^\d+\s+Publication 15-T", txt[j]):
            toks = re.findall(NUM, txt[j])
            if len(toks) == 8 and txt[j].strip().startswith("$"):
                v = [money(t) for t in toks]
                rows.append({"atLeast": v[0], "lessThan": v[1], "married_joint": {"standard": v[2], "step2Checked": v[3]},
                             "head_of_household": {"standard": v[4], "step2Checked": v[5]}, "single": {"standard": v[6], "step2Checked": v[7]}})
            j += 1
json.dump({"source": "IRS Publication 15-T (2026), https://www.irs.gov/pub/irs-pdf/p15t.pdf",
           "annual": annual, "manualPercentage": manual, "wageBracket": wb}, open(out, "w"), indent=1)
print({k: len(v) for k, v in wb.items()}, {k: {s: len(r) for s, r in v["standard"].items()} for k, v in manual.items()})

if len(sys.argv) > 3:
    cols = ["atLeast", "lessThan", "mfjStandard", "mfjStep2", "hohStandard", "hohStep2", "singleStandard", "singleStep2"]
    lines = ["{",
             ' "_source": "IRS Publication 15-T (2026), https://www.irs.gov/pub/irs-pdf/p15t.pdf. Transcribed by scripts/engine-crosscheck/parse_p15t.py from the PDF text (pdftotext -layout).",',
             ' "_annual": "Section 1, 2026 Percentage Method Tables for Automated Payroll Systems (p. 12): rows [A at least, C tentative amount, D rate].",',
             ' "annual": ' + json.dumps(annual, separators=(",", ":")) + ",",
             ' "_wageBracket": "Section 2, 2026 Wage Bracket Method Tables for Manual Payroll Systems with Forms W-4 From 2020 or Later (pp. 13-27). Columns: ' + ", ".join(cols) + '. Daily tables omitted: PayTrail has no daily pay frequency.",',
             ' "wageBracketColumns": ' + json.dumps(cols) + ",",
             ' "wageBracket": {']
    freqs = ["weekly", "biweekly", "semimonthly", "monthly"]
    for i, f in enumerate(freqs):
        rows = wb[f]
        lines.append(f'  "{f}": [')
        for j, r in enumerate(rows):
            v = [r["atLeast"], r["lessThan"], r["married_joint"]["standard"], r["married_joint"]["step2Checked"],
                 r["head_of_household"]["standard"], r["head_of_household"]["step2Checked"], r["single"]["standard"], r["single"]["step2Checked"]]
            v = [int(x) if x == int(x) else x for x in v]
            lines.append("   " + json.dumps(v, separators=(",", ":")) + ("," if j < len(rows) - 1 else ""))
        lines.append("  ]" + ("," if i < len(freqs) - 1 else ""))
    lines += [" }", "}"]
    open(sys.argv[3], "w").write("\n".join(lines) + "\n")
