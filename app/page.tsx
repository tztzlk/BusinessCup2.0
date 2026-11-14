import Image from "next/image";
import Link from "next/link";
import { ButtonLink, Card } from "@/components/ui";
import { IconCheckCircle, IconMinus } from "@/components/Icons";
import { CatchTicker, HeroStack } from "@/components/HeroArt";
import { LogoMark } from "@/components/Logo";
import { PayStubArt, W2Art } from "@/components/PaperArt";
import { QuickEstimate } from "@/components/QuickEstimate";

const VALUE = [
  {
    title: "Paycheck checkup",
    body: "Upload a pay stub. We check federal withholding, Social Security and Medicare, overtime pay and your 401(k) match — and show every mistake in dollars.",
  },
  {
    title: "April projection + W-4 fix",
    body: "See whether your two-income household will owe or get a refund in April, and the exact Step 4(c) amount to put on each W-4 to fix it now.",
  },
  {
    title: "January tax-season prep",
    body: "A checklist of every tax form you should receive, W-2s reconciled against your pay stubs, and a clean packet for your accountant.",
  },
];

// Only steps that work end to end today.
const HOW_TO_TEST = [
  {
    title: "November: the paycheck checkup",
    points: [
      "Open the sample two-income household",
      "See the April projection and the Step 4(c) amount for each W-4",
      "Open “Show calculation” on any finding",
    ],
    cta: "Open the sample household",
    href: "/demo/couple",
  },
  {
    title: "January: tax season",
    points: [
      "The same household after year end, with both W-2s in",
      "W-2 reconciliation catches a $1,560 box 12 D error",
      "Mark a form received, download the accountant packet, add reminders to your calendar",
    ],
    cta: "Open the January view",
    href: "/demo/couple?view=january",
  },
  {
    title: "Your own pay stub",
    points: [
      "Upload a PDF or a phone photo of a pay stub or W-2, or press “Try with a sample pay stub”",
      "Confirm the fields Claude read, then see your report",
      "Get Annual on My report with the Stripe test card 4242 4242 4242 4242 (test mode, no charge)",
      "Only confirmed fields are kept, encrypted; delete them anytime from My report",
    ],
    cta: "Check a pay stub",
    href: "/check",
  },
];

// Engine results for the sample households, locked by tests/demo.test.ts and tests/personas.test.ts.
const SAMPLE_REPORTS = [
  {
    href: "/demo/couple",
    who: "Alex & Jordan",
    tag: "Two salaries",
    finding: "Owe ~$7,573 in April",
    detail: "Fix: W-4 Step 4(c) +$999 and +$895 per paycheck",
  },
  {
    href: "/demo/hourly",
    who: "Rosa & Tom",
    tag: "Hourly + salaried",
    finding: "$132 of overtime missing",
    detail: "92 hours in two weeks, no overtime line on the stub",
  },
  {
    href: "/demo/salaried",
    who: "Nina & Marcus",
    tag: "Two salaries",
    finding: "$1,920 a year of 401(k) match unclaimed",
    detail: "Saves 3% of pay, employer matches up to 5%",
  },
];

// Only what each product's own page says (checked 15 Nov 2026, links under the table). "—" = not mentioned there.
const COMPARE_COLUMNS = [
  { name: "PayTrail", note: "this site" },
  { name: "IRS Tax Withholding Estimator", note: "irs.gov", url: "https://www.irs.gov/individuals/tax-withholding-estimator" },
  {
    name: "Paycheck Optimizer by april",
    note: "inside Gusto",
    url: "https://support.gusto.com/article/250923184715297/Paycheck-Optimizer-powered-by-april",
  },
  { name: "WageWatch", note: "iPhone app", url: "https://apps.apple.com/us/app/id6744068979" },
  { name: "TurboTax W-4 Calculator", note: "turbotax.com", url: "https://turbotax.intuit.com/tax-tools/calculators/w4/" },
];

const COMPARE_ROWS: { label: string; cells: [string, string, string, string, string] }[] = [
  {
    label: "Price",
    cells: ["Free for one pay stub, Annual $99/year", "Free", "Free", "Free", "—"],
  },
  {
    label: "Who can use it",
    cells: [
      "Any W-2 household, in a browser",
      "Anyone, in a browser, no login",
      "Only employees paid through Gusto, after 3 Gusto paychecks this year, in the Gusto mobile app",
      "iPhone users",
      "In a browser, on turbotax.com",
    ],
  },
  {
    label: "How it gets your pay data",
    cells: [
      "Reads a PDF or photo of your pay stub or W-2; you confirm each field",
      "You enter figures from your recent pay statements",
      "Your Gusto payroll profile plus questions in the app",
      "Your schedule and pay rate, plus paycheck photos",
      "You enter your taxable income per pay period from your pay stubs",
    ],
  },
  {
    label: "Checks each paycheck for mistakes",
    cells: [
      "Withholding vs. W-4, Social Security, Medicare, overtime, 401(k) match, net pay",
      "—",
      "—",
      "Underpayments, missed overtime, unpaid breaks",
      "—",
    ],
  },
  {
    label: "April owe-or-refund estimate and W-4 fix",
    cells: [
      "Both earners, exact Step 4(c) for each job",
      "Yes, including a working spouse; pre-filled W-4",
      "Federal only; your W-4 is updated in Gusto if you accept",
      "—",
      "Refund or balance due; shows how to fill out your W-4",
    ],
  },
  {
    label: "January: W-2 vs. pay stubs, form checklist",
    cells: ["Yes, plus a packet for your accountant", "—", "—", "—", "—"],
  },
  {
    label: "Keeps your data",
    cells: [
      "Confirmed fields only, encrypted; delete anytime",
      "No: cleared when you close the browser window",
      "—",
      "—",
      "—",
    ],
  },
];

const NATP_FEES = "https://dam.natptax.com/m/39796eb5ee56a576/original/TAXPROPages.pdf";

const PRIVACY = [
  ["Claude reads, code calculates", "AI only reads your document. Every number comes from a tested tax engine with IRS-sourced parameters."],
  [
    "Documents never stored by us",
    "Your file is read in memory by Claude through Anthropic's commercial API, then discarded. We never extract or save your SSN. Anthropic doesn't train on API data without permission and deletes it within 30 days, except content flagged for policy review.",
  ],
  [
    "Field-level encryption",
    "Each family's data is encrypted with its own key. We never store that key: it is rebuilt for each request from a secret kept in your browser and our server key. A copy of our database alone is unreadable.",
  ],
  ["Delete anytime", "One click removes everything. Inactive data is erased automatically after 30 days."],
];

// Only what the plans actually enforce today: lib/plan.ts, the 402s in app/api/documents and
// app/api/checklist, and the locked sections of CheckupView. `true` = included, a string = included with a limit.
const PLAN_ROWS: Array<[feature: string, free: string | boolean, annual: string | boolean]> = [
  ["Pay stub checkup, every finding in dollars", "1 pay stub", "Every pay stub, both earners"],
  ["April projection: owe or refund", true, true],
  ["Exact W-4 Step 4(c) fix for each job", false, true],
  ["January: tax-form checklist, W-2 reconciliation, accountant packet", false, true],
  ["Calendar reminders for paydays and tax-form due dates", false, true],
  ["Paycheck history", "Your 1 stub", "Every stub, all year"],
];

function PlanCell({ value, plan }: { value: string | boolean; plan: string }) {
  if (value === true)
    return (
      <>
        <IconCheckCircle aria-hidden="true" className="mx-auto h-5 w-5 text-brand-600" />
        <span className="sr-only">Included in {plan}</span>
      </>
    );
  if (value === false)
    return (
      <>
        <IconMinus aria-hidden="true" className="mx-auto h-5 w-5 text-slate-300" />
        <span className="sr-only">Not in {plan}</span>
      </>
    );
  return <span className="text-xs font-medium text-slate-700 sm:text-sm">{value}</span>;
}

/** Small illustration on top of each value card. */
function ValueArt({ index }: { index: number }) {
  return (
    <div aria-hidden="true" className="relative h-36 overflow-hidden border-b border-slate-100 bg-slate-50">
      {index === 0 && (
        <PayStubArt className="absolute left-1/2 top-5 w-48 -translate-x-1/2 -rotate-3 rounded-xl shadow-md" />
      )}
      {index === 1 && (
        <div className="absolute inset-x-5 top-6 -rotate-2 rounded-xl bg-rose-50 p-4 shadow-md ring-1 ring-rose-200">
          <p className="text-xs text-rose-800">April 2027 projection, sample</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-rose-950">You may owe ~$7,573</p>
          <p className="mt-2 inline-block rounded-md bg-white px-2 py-1 font-mono text-xs text-brand-700 ring-1 ring-brand-200">
            W-4 Step 4(c): +$999 / paycheck
          </p>
        </div>
      )}
      {index === 2 && (
        <W2Art className="absolute left-1/2 top-5 w-60 -translate-x-1/2 rotate-2 rounded-lg shadow-md" />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="relative grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_330px] lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <LogoMark animate breathe size={64} className="h-auto w-12 text-white sm:w-14" />
              <p className="rise-in text-sm text-brand-200" style={{ animationDelay: "0.5s" }}>
                For two-income W-2 households
              </p>
            </div>
            <h1 style={{ animationDelay: "0.65s" }} className="rise-in mt-4 max-w-2xl text-3xl font-semibold leading-[1.1] sm:text-4xl lg:text-[44px] lg:tracking-[-0.02em]">
              Catch paycheck mistakes now, not a surprise tax bill in April
            </h1>
            <p className="rise-in mt-5 max-w-xl text-lg leading-relaxed text-slate-300" style={{ animationDelay: "0.8s" }}>
              When both of you work, withholding quietly falls short. PayTrail checks every pay stub, tells you what you&apos;ll owe or
              get back, and what to change on your W-4 today.
            </p>
            <div className="rise-in mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.95s" }}>
              <ButtonLink href="/check" className="bg-white !text-ink hover:bg-slate-100">
                Check my pay stub
              </ButtonLink>
              <ButtonLink href="/demo" className="border border-white/20 bg-white/5 hover:bg-white/10">
                See a sample household
              </ButtonLink>
            </div>
            <p className="rise-in mt-4 text-sm text-slate-400" style={{ animationDelay: "1.1s" }}>
              No sign-up. The samples are fictional households.{" "}
              <a href="#how-to-test" className="text-slate-200 underline underline-offset-2 hover:text-white">
                Judges: how to test in 3 minutes
              </a>
            </p>
          </div>
          <div className="rise-in md:pr-6" style={{ animationDelay: "0.3s" }}>
            <HeroStack />
          </div>
        </div>
      </section>

      <div className="mt-6">
        <CatchTicker />
        <p className="mt-2 text-center text-xs text-slate-500">
          What our checks find on the fictional sample households. Your numbers come from your own pay stubs.
        </p>
      </div>

      <QuickEstimate />

      <section id="how-to-test" className="mt-12 scroll-mt-20">
        <h2 className="text-2xl font-semibold text-slate-900">How to test PayTrail</h2>
        <p className="mt-1 text-sm text-slate-600">About 3 minutes. No sign-up, nothing to install.</p>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {HOW_TO_TEST.map((s, i) => (
            <li key={s.title} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5">
              <p className="font-mono text-xs text-slate-500">Step {i + 1}</p>
              <h3 className="mt-1 font-semibold text-slate-900">{s.title}</h3>
              <ul className="mt-2 mb-4 list-disc space-y-1 pl-4 text-sm text-slate-600">
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <ButtonLink href={s.href} variant={i === 0 ? "primary" : "secondary"} className="mt-auto w-full">
                {s.cta}
              </ButtonLink>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {VALUE.map((v, i) => (
          <div key={v.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ValueArt index={i} />
            <div className="p-5">
            <h2 className="font-semibold text-slate-900">{v.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{v.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-12 scroll-mt-20" id="samples">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">See a full report before you upload</h2>
            <p className="mt-1 text-sm text-slate-600">
              Three fictional households, computed by the same engine. Open &ldquo;Show calculation&rdquo; on any finding to see every step.
            </p>
          </div>
          <Link href="/accuracy" className="text-sm font-medium text-brand-700 hover:underline">
            How accurate is this? →
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {SAMPLE_REPORTS.map((r) => (
            <Link key={r.href} href={r.href} className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
              <p className="text-xs text-slate-500">
                {r.who} · {r.tag}
              </p>
              <p className="mt-2 text-lg font-semibold leading-snug text-slate-900">{r.finding}</p>
              <p className="mt-1 text-sm text-slate-600">{r.detail}</p>
              <p className="mt-auto pt-4 text-sm font-medium text-brand-700 group-hover:underline">Open the report with calculations →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-slate-900">Built for documents with your salary on them</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {PRIVACY.map(([title, body]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          What we keep, where it goes and how deletion works:{" "}
          <Link href="/privacy" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900">
            Privacy policy
          </Link>
          {" · "}
          <Link href="/accuracy" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900">
            Accuracy and limits
          </Link>
        </p>
      </section>

      <section className="mt-12 scroll-mt-20" id="compare">
        <h2 className="text-2xl font-semibold text-slate-900">How PayTrail compares</h2>
        <p className="mt-1 text-sm text-slate-600">
          Good free withholding calculators exist. PayTrail reads your pay stubs, checks each paycheck and closes the year with your
          W-2s.
        </p>
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th scope="col" className="w-40 px-4 py-3 font-medium text-slate-500">
                  <span className="sr-only">Feature</span>
                </th>
                {COMPARE_COLUMNS.map((c, i) => (
                  <th key={c.name} scope="col" className={`px-4 py-3 align-bottom ${i === 0 ? "bg-brand-50" : ""}`}>
                    <span className="block font-semibold text-slate-900">{c.name}</span>
                    <span className="block text-xs font-normal text-slate-500">{c.note}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="px-4 py-3 font-medium text-slate-700">
                    {row.label}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={`px-4 py-3 ${i === 0 ? "bg-brand-50 font-medium text-slate-900" : cell === "—" ? "text-slate-400" : "text-slate-600"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          &ldquo;—&rdquo; means the product&apos;s own page doesn&apos;t mention it. Checked 15 November 2026 on each product&apos;s page:{" "}
          {COMPARE_COLUMNS.filter((c) => c.url).map((c, i, all) => (
            <span key={c.name}>
              <a href={c.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-slate-700">
                {c.name}
              </a>
              {i < all.length - 1 ? " · " : "."}
            </span>
          ))}{" "}
          PayTrail checks federal tax only; see{" "}
          <Link href="/accuracy" className="underline underline-offset-2 hover:text-slate-700">
            what it doesn&apos;t cover
          </Link>
          .
        </p>
      </section>

      <section className="mt-12 scroll-mt-20" id="pricing">
        <h2 className="text-2xl font-semibold text-slate-900">Pricing</h2>
        <p className="mt-1 text-sm text-slate-600">
          TurboTax helps you file in April. PayTrail catches problems all year, before you file.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px]">
          <Card className="overflow-hidden !p-0">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Free and Annual plans compared</caption>
              <colgroup>
                <col />
                <col className="w-[5.5rem] sm:w-40" />
                <col className="w-[6.5rem] sm:w-48" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 align-bottom">
                  <th scope="col" className="px-3 py-4 font-medium text-slate-500 sm:px-5">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="px-2 py-4 text-center sm:px-3">
                    <span className="block font-semibold text-slate-900">Free</span>
                    <span className="block text-2xl font-semibold tabular-nums text-slate-900">$0</span>
                  </th>
                  <th scope="col" className="rounded-tr-xl bg-brand-50 px-2 py-4 text-center sm:px-3">
                    <span className="block font-semibold text-brand-800">Annual</span>
                    <span className="block text-2xl font-semibold tabular-nums text-slate-900">
                      $99<span className="text-sm font-medium text-slate-500">/year</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PLAN_ROWS.map(([feature, free, annual]) => (
                  <tr key={feature}>
                    <th scope="row" className="px-3 py-3 font-normal text-slate-700 sm:px-5">
                      {feature}
                    </th>
                    <td className="px-2 py-3 text-center sm:px-3">
                      <PlanCell value={free} plan="Free" />
                    </td>
                    <td className="bg-brand-50 px-2 py-3 text-center sm:px-3">
                      <PlanCell value={annual} plan="Annual" />
                    </td>
                  </tr>
                ))}
                <tr className="hidden sm:table-row">
                  <td className="px-5 py-4" />
                  <td className="px-2 py-4 sm:px-3">
                    <ButtonLink href="/check" variant="secondary" className="w-full">
                      Start free
                    </ButtonLink>
                  </td>
                  <td className="rounded-br-xl bg-brand-50 px-2 py-4 sm:px-3">
                    {/* Checkout starts from a household's report; from here this shows Annual on the sample household. */}
                    <ButtonLink href="/demo/couple" className="w-full !px-2">
                      See Annual in a sample
                    </ButtonLink>
                  </td>
                </tr>
              </tbody>
            </table>
            {/* Phone: the table columns are too narrow for buttons. */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 sm:hidden">
              <ButtonLink href="/check" variant="secondary">
                Start free
              </ButtonLink>
              <ButtonLink href="/demo/couple">See Annual</ButtonLink>
            </div>
          </Card>
          {/* Mirrored so she points left, at the plans. */}
          <Image
            src="/illustrations/annual-guide.webp"
            alt="Illustration: a woman holding her pay stubs points to the Annual plan"
            width={400}
            height={531}
            className="hidden h-auto w-[190px] -scale-x-100 self-end lg:block"
          />
        </div>
        <p className="mt-4 max-w-3xl text-sm text-slate-600">
          <strong className="font-semibold text-slate-900">Why $99:</strong> one finding can pay for the year. On our sample households,
          a single paycheck was $132 short on overtime, and a 401(k) match worth $1,920 a year went unclaimed. A tax pro charges
          $184–$280 on average to prepare a basic Form 1040, depending on credentials (
          <a href={NATP_FEES} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-slate-900">
            NATP 2025 Fee Study
          </a>
          ).
        </p>
      </section>
    </div>
  );
}
