import { ButtonLink, Card } from "@/components/ui";
import { LogoMark } from "@/components/Logo";

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
      "Unlock Annual on My report with the Stripe test card 4242 4242 4242 4242 (test mode, no charge)",
      "Only confirmed fields are kept, encrypted; delete them anytime from My report",
    ],
    cta: "Check a pay stub",
    href: "/check",
  },
];

const PRIVACY = [
  ["Claude reads, code calculates", "AI only reads your document. Every number comes from a tested tax engine with IRS-sourced parameters."],
  ["Documents never stored", "Your file is processed in memory and discarded. Only the fields you confirm are kept."],
  ["Field-level encryption", "Your data is encrypted with a key that only your browser holds. A copy of our database alone is unreadable."],
  ["Delete anytime", "One click removes everything. Inactive data is erased automatically after 30 days."],
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 sm:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/25 blur-3xl"
        />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div className="order-2 md:order-1">
        <p className="rise-in text-sm font-medium uppercase tracking-wide text-brand-300" style={{ animationDelay: "0.5s" }}>
          For two-income W-2 households
        </p>
        <h1 className="rise-in mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl" style={{ animationDelay: "0.65s" }}>
          Catch paycheck mistakes now — not a surprise tax bill in April.
        </h1>
        <p className="rise-in mt-4 max-w-2xl text-brand-100" style={{ animationDelay: "0.8s" }}>
          When both of you work, withholding quietly falls short. PayTrail checks every pay stub, tells you what you&apos;ll owe or
          get back, and what to change on your W-4 today.
        </p>
        <div className="rise-in mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.95s" }}>
          <ButtonLink href="/demo" className="bg-white !text-brand-950 hover:bg-brand-100">
            Try the demo
          </ButtonLink>
          <ButtonLink href="/check" className="bg-brand-500 hover:bg-brand-400">
            Check my pay stub
          </ButtonLink>
        </div>
        <p className="rise-in mt-4 text-xs text-brand-300" style={{ animationDelay: "1.1s" }}>
          No sign-up. The demo uses a fictional household.{" "}
          <a href="#how-to-test" className="underline hover:text-white">
            Judges: how to test in 3 minutes
          </a>
        </p>
        </div>
        <div className="order-1 flex justify-start md:order-2 md:justify-end">
          <LogoMark animate size={180} className="logo-glow h-auto w-24 text-white sm:w-32 md:w-44" />
        </div>
        </div>
      </section>

      <section id="how-to-test" className="mt-10 scroll-mt-20 rounded-2xl border border-brand-200 bg-brand-50/60 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-slate-900">How to test PayTrail</h2>
        <p className="mt-1 text-sm text-slate-600">About 3 minutes. No sign-up, nothing to install.</p>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {HOW_TO_TEST.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Step {i + 1}</p>
              <h3 className="mt-1 font-semibold text-slate-900">{s.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-600">
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <ButtonLink href={s.href} variant={i === 0 ? "primary" : "secondary"} className="mt-4 w-full">
                {s.cta}
              </ButtonLink>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {VALUE.map((v, i) => (
          <Card key={v.title}>
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {i + 1}
            </div>
            <h2 className="font-semibold text-slate-900">{v.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{v.body}</p>
          </Card>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">Built for documents with your salary on them</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {PRIVACY.map(([title, body]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12" id="pricing">
        <h2 className="text-2xl font-bold text-slate-900">Pricing</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="font-semibold text-slate-900">Free</h3>
            <p className="mt-1 text-3xl font-bold text-slate-900">$0</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>One pay stub checkup: every mistake in dollars</li>
              <li>April projection: owe or refund</li>
            </ul>
            <ButtonLink href="/check" variant="secondary" className="mt-6 w-full">
              Start free
            </ButtonLink>
          </Card>
          <Card className="border-brand-300 ring-2 ring-brand-100">
            <h3 className="font-semibold text-slate-900">Annual</h3>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              $79<span className="text-base font-medium text-slate-500">/year</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>Every pay stub, both earners, all year</li>
              <li>April projection and W-4 fixes per job</li>
              <li>January checklist, W-2 reconciliation, accountant packet</li>
            </ul>
            {/* Until Stripe Checkout is live this shows the Annual features on the sample household. */}
            <ButtonLink href="/demo/couple" className="mt-6 w-full">
              See everything in Annual
            </ButtonLink>
          </Card>
        </div>
      </section>
    </div>
  );
}
