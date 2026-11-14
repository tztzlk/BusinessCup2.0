import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Card, Notice, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Accuracy — PayTrail",
  description: "How PayTrail calculates withholding and your April projection, which IRS sources it uses, and how we checked it.",
};

// Numbers on this page come from docs/ENGINE-CROSSCHECK.md, docs/EVAL-EXTRACT.md, lib/engine/params/2026/federal.json
// and `npx vitest run`. Supported scenarios were checked against lib/engine. Update this page when they change.

const REPO = "https://github.com/tztzlk/BusinessCup2.0";
const DOC = (path: string) => `${REPO}/blob/main/${path}`;
const UPDATED = "15 November 2026";

const STATS = [
  { value: "4,350 / 4,350", label: "amounts in the IRS Pub. 15-T 2026 wage-bracket tables reproduced by our withholding engine" },
  { value: "20 / 20", label: "IRS Worksheet 1A withholding test cases matched to the cent" },
  { value: "≤ $0.01", label: "difference in annual federal tax from two open-source tax models, on 11 test households" },
  { value: "209 / 209", label: "fields read exactly on 11 synthetic test documents in our own layouts" },
];

const STEPS = [
  {
    title: "Claude reads",
    body: "Claude, an AI model by Anthropic, copies the values printed on your pay stub or W-2 into a fixed list of fields. It does not calculate anything.",
  },
  {
    title: "You confirm",
    body: "You see every field it read, with uncertain ones marked, and can correct any of them. Nothing is saved until you confirm.",
  },
  {
    title: "Code calculates",
    body: "Every number in your report comes from our tax engine: ordinary, tested code that gives the same result for the same input, using tax rules taken from IRS publications.",
  },
];

const SOURCES: Array<[string, string, string]> = [
  ["IRS Publication 15-T (2026)", "https://www.irs.gov/publications/p15t", "Worksheet 1A and the annual percentage tables for per-paycheck withholding"],
  ["IRS Rev. Proc. 2025-32", "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf", "2026 standard deductions and bracket limits"],
  ["IRS: Working Families Tax Cuts", "https://www.irs.gov/newsroom/working-families-tax-cuts-individuals-and-workers", "2026 tax brackets"],
  ["SSA: contribution and benefit base", "https://www.ssa.gov/oact/COLA/cbb.html", "Social Security wage base, $184,500"],
  ["IRS: 2026 401(k) limit", "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500", "Elective deferral limit, $24,500"],
  ["IRS: Child Tax Credit", "https://www.irs.gov/credits-deductions/individuals/child-tax-credit", "$2,200 per child, refundable part and phase-out"],
  ["IRS: No tax on overtime", "https://www.irs.gov/newsroom/what-to-know-about-the-no-tax-on-overtime-deduction", "Overtime deduction cap and phase-out"],
  ["IRS Topic 560", "https://www.irs.gov/taxtopics/tc560", "Additional Medicare Tax"],
  ["US Department of Labor: overtime", "https://www.dol.gov/agencies/whd/overtime", "Time-and-a-half after 40 hours in a workweek"],
];

const SUPPORTED = [
  "Filing status: single, married filing jointly, married filing separately, head of household",
  "One or two earners, up to 4 jobs per household",
  "Children under 17 (Child Tax Credit, $2,200 each) and other dependents ($500 credit), with phase-out and the refundable part",
  "Weekly, biweekly, semimonthly and monthly pay",
  "W-4 Steps 2, 3, 4(a), 4(b) and 4(c) in the per-paycheck withholding check",
  "Pre-tax 401(k), and Section 125 health, dental and vision, HSA and FSA deductions",
  "The 2026 overtime deduction for time-and-a-half overtime, with its cap and phase-out",
  "Social Security, Medicare and Additional Medicare Tax",
  "A one-time bonus, counted once rather than repeated",
  "The $24,500 401(k) limit per person, and extra Social Security withheld by two employers of one person",
];

const NOT_SUPPORTED = [
  "State and local income tax",
  "Earned Income Tax Credit (EITC). For lower-income families with children, PayTrail shows a refund that is too small: in our test, $764 for a head of household with 2 children earning $55,000",
  "Itemized deductions (the standard deduction is always used)",
  "Self-employment and 1099 income, and other income such as interest or dividends, in the April projection",
  "A job that ended during the year: the projection assumes each job keeps paying until December",
  "The alternative refundable Child Tax Credit formula for families with 3 or more children",
  "Age-based rules: the deduction for people 65 and older, the extra standard deduction for 65+ or blind, and 401(k) catch-up contributions (we don't ask your age)",
  "Double-time or state daily overtime: the overtime deduction assumes time-and-a-half",
  "Tips and car-loan interest deductions",
  "Tax years other than 2026",
];

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-600">
      {children}
    </a>
  );
}

export default function AccuracyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Badge tone="warning">Hackathon prototype</Badge>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">Accuracy</h1>
      <p className="mt-2 text-slate-600">
        How PayTrail calculates your withholding and April projection, where its tax rules come from, and how we checked it. PayTrail is a
        prototype built at a hackathon: the checks below are real, but it has not been tested on many real-world documents yet.
      </p>
      <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {STATS.map((s) => (
          <Card key={s.value}>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{s.value}</p>
            <p className="mt-1 text-sm text-slate-600">{s.label}</p>
          </Card>
        ))}
      </div>

      <Section title="How it works" subtitle="Claude reads, code calculates.">
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-mono text-xs text-slate-500">Step {i + 1}</p>
              <h3 className="mt-1 font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-slate-600">
          Claude also writes the plain-English explanations in your report, from the finding codes and the numbers the engine already
          computed. If an explanation quotes a dollar amount the engine didn&apos;t produce, PayTrail shows the engine&apos;s own text instead.
        </p>
      </Section>

      <Section title="Methodology and sources">
        <Card>
          <p className="text-sm text-slate-700">
            Every tax number lives in one parameter file for tax year 2026, and each one is linked to its source. The engine code holds no
            tax numbers of its own.
          </p>
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {SOURCES.map(([name, href, use]) => (
              <li key={name} className="py-2.5">
                <Ext href={href}>{name}</Ext>
                <span className="block text-slate-600">{use}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-5 font-semibold text-slate-900">What the engine checks</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            <li>
              Each pay stub: net pay arithmetic, year-to-date totals that go down, Social Security (6.2%) and Medicare (1.45%, plus 0.9%
              over $200,000), federal withholding against Pub. 15-T for the W-4 you entered, overtime paid at less than 1.5× the regular
              rate, and the 401(k) employer match.
            </li>
            <li>
              The April projection: year-to-date amounts from each job&apos;s latest pay stub plus the current paycheck repeated for the
              paychecks left this year, then the 2026 brackets, standard deduction, credits and Additional Medicare Tax. If you&apos;ll owe,
              it splits a W-4 Step 4(c) amount across your jobs.
            </li>
            <li>Each W-2, compared box by box with the year-to-date totals on your latest pay stub of that year from the same employer.</li>
          </ul>
        </Card>
      </Section>

      <Section title="How we verified it">
        <Card>
          <ul className="list-disc space-y-3 pl-5 text-sm text-slate-700">
            <li>
              <strong className="text-slate-900">Withholding vs the IRS tables.</strong> All 144 numbers in the engine&apos;s annual
              percentage tables are identical to Pub. 15-T 2026. The engine reproduces all 4,350 amounts in the Pub. 15-T wage-bracket
              tables (weekly, biweekly, semimonthly and monthly; every filing status; Step 2 checked and unchecked). It matches 20
              Worksheet 1A test cases to the cent, covering W-4 Steps 2, 3, 4(a), 4(b) and 4(c).
            </li>
            <li>
              <strong className="text-slate-900">Annual tax vs two independent models.</strong> On 11 households (our 3 sample households
              and 8 synthetic ones), annual federal tax matches{" "}
              <Ext href="https://github.com/PolicyEngine/policyengine-us">PolicyEngine-US</Ext> 2.124.5 and{" "}
              <Ext href="https://github.com/PSLmodels/Tax-Calculator">Tax-Calculator</Ext> 6.9.1 within $0.01, including the overtime
              deduction and the $2,200 Child Tax Credit. EITC was left out of the comparison because PayTrail doesn&apos;t model it.
            </li>
            <li>
              <strong className="text-slate-900">Document reader.</strong> 209 of 209 fields read exactly on 11 synthetic files (9 PDFs and
              2 screenshots of 9 fictional pay stubs and W-2s), in one run. These are clean documents in our own layouts, and few of them;
              real scans, phone photos and real payroll layouts were not measured. That is why you confirm every field.
            </li>
            <li>
              <strong className="text-slate-900">Automated tests.</strong> 186 tests pass on the current code (one optional diagnostic is
              skipped), including the IRS cases above.
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            Full method, every result and how to reproduce them: <Ext href={DOC("docs/ENGINE-CROSSCHECK.md")}>engine cross-check</Ext>{" "}
            and <Ext href={DOC("docs/EVAL-EXTRACT.md")}>document reader evaluation</Ext>.
          </p>
        </Card>
      </Section>

      <Section title="Supported scenarios">
        <Card>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            {SUPPORTED.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title="Not supported yet">
        <Card>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            {NOT_SUPPORTED.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            If one of these applies to you, treat the April projection as a rough guide.
          </p>
        </Card>
      </Section>

      <Section title="Tax rules last updated">
        <Card>
          <p className="text-sm text-slate-700">
            Tax year 2026 rules (Pub. 15-T 2026, Rev. Proc. 2025-32, the 2026 Social Security wage base and the other sources above),
            last changed on 14 November 2026. Cross-checked on 15 November 2026.
          </p>
        </Card>
      </Section>

      <Section title="What this is not">
        <Notice tone="warning">
          <strong>Estimates only. Not tax advice. Not affiliated with the IRS. Not reviewed by a CPA.</strong> For decisions about your
          taxes, talk to a tax professional.
        </Notice>
        <p className="mt-4 text-sm text-slate-600">
          See also <Link href="/privacy" className="font-medium text-brand-700 underline underline-offset-2">Privacy</Link> and{" "}
          <Link href="/about" className="font-medium text-brand-700 underline underline-offset-2">About</Link>.
        </p>
      </Section>
    </div>
  );
}
