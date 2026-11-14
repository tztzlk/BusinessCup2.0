import { ButtonLink, Card } from "@/components/ui";
import { LogoMark } from "@/components/Logo";
import { CatchTicker, HeroBackdrop, HeroStack } from "@/components/HeroArt";
import { PayStubArt, W2Art } from "@/components/PaperArt";

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

/** Small illustration on top of each value card. */
function ValueArt({ index }: { index: number }) {
  return (
    <div aria-hidden="true" className="relative h-36 overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100">
      {index === 0 && (
        <PayStubArt className="absolute left-1/2 top-5 w-48 -translate-x-1/2 -rotate-3 rounded-xl shadow-lg transition-transform duration-500 group-hover:-translate-y-2" />
      )}
      {index === 1 && (
        <div className="absolute inset-x-5 top-6 -rotate-2 rounded-xl bg-rose-50 p-4 shadow-lg ring-1 ring-rose-200 transition-transform duration-500 group-hover:-translate-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-rose-800/70">April 2027 projection · sample</p>
          <p className="mt-1 text-lg font-bold text-rose-950">You may owe ~$7,573</p>
          <p className="mt-2 inline-block rounded-md bg-white px-2 py-1 font-mono text-xs text-brand-700 ring-1 ring-brand-200">
            W-4 Step 4(c): +$999 / paycheck
          </p>
        </div>
      )}
      {index === 2 && (
        <W2Art className="absolute left-1/2 top-5 w-60 -translate-x-1/2 rotate-2 rounded-lg shadow-lg transition-transform duration-500 group-hover:-translate-y-2" />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-ink px-6 py-10 text-white sm:px-10 sm:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-700/30 blur-3xl"
        />
        <HeroBackdrop />
        <div className="relative grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_330px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="relative z-10">
        <div className="flex items-center gap-3">
          <LogoMark animate breathe size={64} className="logo-glow h-auto w-12 text-white sm:w-14" />
          <p className="rise-in text-sm font-medium uppercase tracking-wide text-brand-300" style={{ animationDelay: "0.5s" }}>
            For two-income W-2 households
          </p>
        </div>
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
          <div key={v.title} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <ValueArt index={i} />
            <div className="p-5">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {i + 1}
            </div>
            <h2 className="font-semibold text-slate-900">{v.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{v.body}</p>
            </div>
          </div>
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
