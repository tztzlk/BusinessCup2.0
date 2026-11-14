import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { federalParams } from "@/lib/engine/params";

export const metadata: Metadata = {
  title: "Accuracy and limits — PayTrail",
  description: "How PayTrail's numbers are made and checked, what the tests show, and what PayTrail does not cover yet.",
};

const UPDATED = "15 November 2026";
const params = federalParams(2026);

// Measured numbers only (rule 7). Update them when the measurement is re-run.
// Tests: `npm test` on main, 15 Nov 2026 (186 passed; the 1 skipped is the optional XCHECK_DUMP step).
// Reader: docs/EVAL-EXTRACT.md. Cross-checks: docs/ENGINE-CROSSCHECK.md.
const TESTS_PASSING = 186;
const READER = { fields: 209, exact: 209, files: 11, documents: 9 };
const REPO = "https://github.com/tztzlk/BusinessCup2.0/blob/main";
const EVAL_DOC = `${REPO}/docs/EVAL-EXTRACT.md`;
const CROSSCHECK_DOC = `${REPO}/docs/ENGINE-CROSSCHECK.md`;
const P15T_PDF = "https://www.irs.gov/pub/irs-pdf/p15t.pdf";

// Independent cross-checks of the engine, from docs/ENGINE-CROSSCHECK.md. Regression-tested in tests/engine-crosscheck.test.ts.
interface CrossCheck {
  against: string;
  url: string;
  what: string;
  result: string;
  /** What counts as a match. */
  match: string;
}
const CROSS_CHECKS: CrossCheck[] = [
  {
    against: "IRS Pub. 15-T (2026), wage-bracket tables",
    url: P15T_PDF,
    what: "Withholding for every published wage bracket: weekly, biweekly, semimonthly, monthly; all filing statuses; Step 2 checked or not",
    result: "4,350 of 4,350",
    match: "Within half a dollar of the printed amount (4,339 identical; 11 differ only by the IRS rounding to whole dollars)",
  },
  {
    against: "IRS Pub. 15-T (2026), Worksheet 1A",
    url: P15T_PDF,
    what: "20 paychecks worked through the IRS worksheet independently, covering W-4 Steps 2, 3, 4(a), 4(b), 4(c) and the 6 sample pay stubs",
    result: "20 of 20",
    match: "To the cent",
  },
  {
    against: "IRS Pub. 15-T (2026), annual percentage tables",
    url: P15T_PDF,
    what: "Every number in the tables the engine uses",
    result: "144 of 144",
    match: "Identical",
  },
  {
    against: "PolicyEngine-US 2.124.5",
    url: "https://github.com/PolicyEngine/policyengine-us",
    what: "Full-year 2026 federal tax for 11 households (the 3 samples + 8 synthetic), incl. Child Tax Credit, overtime deduction, Additional Medicare",
    result: "11 of 11",
    match: "Within $0.01, total and each component",
  },
  {
    against: "PSL Tax-Calculator 6.9.1",
    url: "https://github.com/PSLmodels/Tax-Calculator",
    what: "The same 11 households",
    result: "11 of 11",
    match: "Within $0.01, total and each component",
  },
];

const SOURCE_LABELS: Record<string, string> = {
  pub15t: "IRS Publication 15-T (2026): federal withholding methods",
  revProc: "IRS Rev. Proc. 2025-32: 2026 standard deduction and inflation adjustments",
  brackets: "IRS: 2026 tax brackets",
  ssWageBase: "Social Security Administration: 2026 wage base",
  limit401k: "IRS: 2026 401(k) contribution limit",
  childTaxCredit: "IRS: Child Tax Credit",
  overtimeDeduction: "IRS: No Tax on Overtime deduction",
  additionalMedicare: "IRS Topic 560: Additional Medicare Tax",
  flsaWorkweek: "U.S. Department of Labor: overtime pay",
};

const PIPELINE = [
  ["Claude reads", "Claude reads the fields of your pay stub or W-2 and flags the ones it is unsure of. It does no math."],
  ["You confirm", "You check every field and fix anything wrong. Nothing is saved before you confirm."],
  [
    "Code calculates",
    "A tested tax engine computes every number. Each tax figure it uses sits in one parameters file with a link to its IRS, SSA or DOL source.",
  ],
  [
    "Claude explains",
    "Claude rewrites the engine's findings in plain language. A text that quotes a dollar amount the engine didn't produce, or says refund when you owe, is thrown away and the engine's own text is shown.",
  ],
];

const LIMITS = [
  "Federal income tax only. State and local income taxes are not calculated.",
  "Standard deduction only. Itemized deductions (mortgage interest, state and local taxes, charity) are not modeled.",
  "Wages from W-2 jobs only. Interest, dividends, capital gains, 1099 contract work and self-employment income are not in the April projection. Your January checklist still lists the 1099 forms to expect.",
  "The Earned Income Tax Credit (EITC) is not included. For lower-income families with children, PayTrail can show a refund that is too small: in our cross-check, $764.23 too small for a head of household with 2 children earning $55,000.",
  "Other credits: only the Child Tax Credit and the credit for other dependents are included. Education, child care and other credits are not, nor the alternative refundable Child Tax Credit formula for families with 3 or more children.",
  "Age-based items are not modeled because we don't ask your age: the extra standard deduction and the new deduction for people 65 and older, and 401(k) catch-up contributions for ages 50+.",
  "The tips and car-loan interest deductions are not modeled.",
  "The overtime check uses the federal 40-hour workweek and assumes time-and-a-half. State daily-overtime rules, such as California's, and double time are not checked.",
  "A job that ended during the year: the April projection assumes each job keeps paying through December.",
  "2026 tax rules, up to 4 jobs per household.",
  "The document reader was tested on clean, digitally made documents. Phone photos and real payroll layouts may read worse, which is why you confirm every field.",
];

const SAMPLES = [
  ["/demo/couple", "Alex & Jordan", "April projection and the W-4 Step 4(c) amount for each job"],
  ["/demo/hourly", "Rosa & Tom", "92 hours in two weeks with no overtime line"],
  ["/demo/salaried", "Nina & Marcus", "A 401(k) match left on the table"],
];

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 text-xl font-semibold text-slate-900">{children}</h2>;
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900">
      {children}
    </a>
  );
}

export default function AccuracyPage() {
  const sources = Object.entries(params.sources);
  return (
    <article className="mx-auto max-w-3xl text-slate-700">
      <p className="text-sm text-slate-500">Last updated {UPDATED}</p>
      <h1 className="mt-1 text-3xl font-semibold text-slate-900">Accuracy and limits</h1>
      <p className="mt-3 text-lg leading-relaxed">
        How PayTrail&apos;s numbers are made, how we test them, and what PayTrail doesn&apos;t cover yet. Estimates only. Not tax
        advice. Not affiliated with the IRS.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-3xl font-semibold tabular-nums text-slate-900">4,350 / 4,350</p>
          <p className="mt-1 text-sm text-slate-600">withholding amounts in the IRS&apos;s 2026 Pub. 15-T wage-bracket tables reproduced.</p>
        </Card>
        <Card className="p-4">
          <p className="text-3xl font-semibold tabular-nums text-slate-900">±$0.01</p>
          <p className="mt-1 text-sm text-slate-600">
            annual federal tax vs. PolicyEngine-US and Tax-Calculator on 11 households. EITC not modeled.
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-3xl font-semibold tabular-nums text-slate-900">{TESTS_PASSING}</p>
          <p className="mt-1 text-sm text-slate-600">automated tests pass. They run before every deploy, with type checks and lint.</p>
        </Card>
        <Card className="p-4">
          <p className="text-3xl font-semibold tabular-nums text-slate-900">
            {READER.exact} / {READER.fields}
          </p>
          <p className="mt-1 text-sm text-slate-600">fields read exactly from {READER.files} synthetic test documents.</p>
        </Card>
      </div>

      <H2>How a number gets to your screen</H2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {PIPELINE.map(([title, body], i) => (
          <li key={title} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-mono text-xs text-slate-500">Step {i + 1}</p>
            <h3 className="mt-0.5 font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{body}</p>
          </li>
        ))}
      </ol>

      <H2>The tax engine</H2>
      <p className="mt-2">
        It follows IRS Publication 15-T (2026), Worksheet 1A, to compute what each paycheck should withhold, then projects the
        household&apos;s full-year federal tax for April. The test suite checks it against values worked out by hand from Pub. 15-T and
        Rev. Proc. 2025-32, and locks in the results of the sample households, so a change that moves any of them fails before
        deploy. On 14 November 2026 we audited the engine against the primary sources below.
      </p>
      <Card className="mt-4">
        <h3 className="font-semibold text-slate-900">Sources the engine uses</h3>
        <ul className="mt-2 space-y-1.5 text-sm">
          {sources.map(([key, url]) => (
            <li key={key}>
              <Ext href={url}>{SOURCE_LABELS[key] ?? key}</Ext>
            </li>
          ))}
        </ul>
      </Card>

      <H2>Independent cross-checks</H2>
      <p className="mt-2">
        On 15 November 2026 we ran the engine against the IRS&apos;s own 2026 tables and two open-source tax models that know the 2026
        law. No engine bug was found in the paths covered. Every result below is a regression test now, so it is re-checked on each
        deploy.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Compared with</th>
              <th scope="col" className="px-4 py-2.5 font-medium">What</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Matched</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Match means</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white align-top">
            {CROSS_CHECKS.map((c) => (
              <tr key={c.against}>
                <td className="px-4 py-3">
                  <Ext href={c.url}>{c.against}</Ext>
                </td>
                <td className="px-4 py-3">{c.what}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-slate-900">{c.result}</td>
                <td className="px-4 py-3">{c.match}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">
        The one gap it found is scope, not a bug: the Earned Income Tax Credit is not modeled (see the limits below). The IRS Tax
        Withholding Estimator is an interactive form, so it was not compared automatically. Method, versions and every household:{" "}
        <Ext href={CROSSCHECK_DOC}>ENGINE-CROSSCHECK.md</Ext>.
      </p>

      <H2>The document reader</H2>
      <p className="mt-2">
        On {READER.documents} synthetic pay stubs and W-2s in our own layouts ({READER.files} files: PDFs plus 2 PNG screenshots), the
        reader returned {READER.exact} of {READER.fields} fields exactly: dates, amounts, year-to-date totals, hours, rates and W-2 boxes.
        It also kept our planted errors as printed instead of &ldquo;fixing&rdquo; them, which the checks depend on.
      </p>
      <Card className="mt-4">
        <h3 className="font-semibold text-slate-900">Why this is not &ldquo;100% accurate&rdquo;</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>The documents are clean and digitally made. Crumpled phone photos and skewed scans were not tested.</li>
          <li>They use our own layouts, not real ADP, Paychex, Gusto or Workday stubs or the official IRS W-2.</li>
          <li>The PDFs carry a text layer. Only the 2 PNG screenshots test reading from pixels alone.</li>
          <li>One run, few documents. Treat it as a smoke test, not a benchmark.</li>
        </ul>
        <p className="mt-2 text-sm">
          That is why every field goes through your confirmation before it is saved. Method, fixtures and raw results:{" "}
          <Ext href={EVAL_DOC}>EVAL-EXTRACT.md</Ext>.
        </p>
      </Card>

      <H2>What PayTrail doesn&apos;t cover yet</H2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        {LIMITS.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>

      <H2>See the math yourself</H2>
      <p className="mt-2">
        Each sample household is a full report computed by the same engine. Open &ldquo;Show calculation&rdquo; on any finding and
        &ldquo;How we calculated&rdquo; under the April projection to see every input and step.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {SAMPLES.map(([href, name, what]) => (
          <Link key={href} href={href} className="group rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
            <p className="font-semibold text-slate-900">{name}</p>
            <p className="mt-1 text-sm text-slate-600">{what}</p>
            <p className="mt-3 text-sm font-medium text-brand-700 group-hover:underline">Open the report →</p>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm">
        How we handle your data:{" "}
        <Link href="/privacy" className="font-medium text-brand-700 underline underline-offset-2">
          Privacy policy
        </Link>
        .
      </p>
    </article>
  );
}
