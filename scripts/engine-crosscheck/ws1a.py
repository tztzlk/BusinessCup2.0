"""Independent implementation of IRS Pub. 15-T (2026) Worksheet 1A (percentage method, 2020+ Form W-4),
written from the worksheet text on p. 10 and the annual tables parsed from the IRS PDF
(not from PayTrail's lib/engine/params/2026/federal.json).

  python3 -I ws1a.py <p15t-2026.json from parse_p15t.py> [lib/engine/params/2026/federal.json]

Prints: (1) the annual tables vs federal.json, number by number; (2) this worksheet at each wage-bracket
midpoint vs every published Wage Bracket Method cell; (3) the largest gap between the IRS's own
automated (Worksheet 1A) and manual (Worksheet 4) percentage methods. The test vectors in
tests/engine-crosscheck.test.ts were produced with ws1a() and cents().
"""
import json
import sys
from decimal import ROUND_HALF_UP, Decimal

PERIODS = {"weekly": 52, "biweekly": 26, "semimonthly": 24, "monthly": 12}
T = json.load(open(sys.argv[1])) if __name__ == "__main__" else None


def schedule(status):
    return "single" if status in ("single", "married_separate") else status


def ws1a(t, wages, freq, status, step2=False, s3=0.0, s4a=0.0, s4b=0.0, s4c=0.0):
    n = PERIODS[freq]
    l1c = wages * n                                   # 1c
    l1e = l1c + s4a                                   # 1d, 1e
    l1g = 0 if step2 else (12900 if status == "married_joint" else 8600)
    l1i = max(0.0, l1e - (s4b + l1g))                 # 1f, 1h, 1i
    rows = t["annual"]["step2Checked" if step2 else "standard"][schedule(status)]
    a, c, d = [r for r in rows if l1i >= r[0]][-1]    # 2b, 2c, 2d
    l2g = c + (l1i - a) * d                           # 2e, 2f, 2g
    l3c = max(0.0, l2g / n - s3 / n)                  # 2h, 3a-3c
    return l3c + s4c                                  # 4a, 4b


def cents(x):
    return float(Decimal(repr(x)).quantize(Decimal("0.01"), ROUND_HALF_UP))


def dollars(x):
    return int(Decimal(repr(x)).quantize(Decimal("1"), ROUND_HALF_UP))


if __name__ == "__main__":
    if len(sys.argv) > 2:
        fed = json.load(open(sys.argv[2]))["withholding"]
        n = bad = 0
        for sched in ("standard", "step2Checked"):
            for st in ("married_joint", "single", "head_of_household"):
                for ra, rb in zip(T["annual"][sched][st], fed[sched][st]):
                    for x, y in zip(ra, rb):
                        n += 1
                        bad += abs(x - y) > 1e-9
        print(f"(1) annual table numbers compared with federal.json: {n}, mismatches: {bad}")

    total = miss = 0
    for freq in PERIODS:
        for row in T["wageBracket"][freq]:
            mid = (row["atLeast"] + row["lessThan"]) / 2
            for st in ("married_joint", "head_of_household", "single"):
                for key in ("standard", "step2Checked"):
                    total += 1
                    miss += dollars(ws1a(T, mid, freq, st, step2=key == "step2Checked")) != row[st][key]
    print(f"(2) wage-bracket cells: {total}, ws1a at midpoint rounded to the dollar differs on {miss}")

    for freq in PERIODS:
        worst = 0.0
        w = 0.0
        while w < 40000 / (PERIODS[freq] / 12):
            for st in ("married_joint", "single", "head_of_household"):
                for step2 in (False, True):
                    rows = T["manualPercentage"][freq]["step2Checked" if step2 else "standard"][st]
                    a, c, d = [r for r in rows if w >= r[0]][-1]
                    worst = max(worst, abs(c + (w - a) * d - ws1a(T, w, freq, st, step2=step2)))
            w += 1.37
        print(f"(3) {freq}: max |Worksheet 4 (manual) - Worksheet 1A (automated)| = ${worst:.4f}")
