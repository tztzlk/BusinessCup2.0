import Image from "next/image";
import { ButtonLink, Card } from "@/components/ui";
import { CatchTicker, HeroStack } from "@/components/HeroArt";
import { LogoMark } from "@/components/Logo";
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
      "Get Annual on My report with the Stripe test card 4242 4242 4242 4242 (test mode, no charge)",
      "Only confirmed fields are kept, encrypted; delete them anytime from My report",
    ],
    cta: "Check a pay stub",
    href: "/check",
  },
];

const PRIVACY = [
  ["Claude reads, code calculates", "AI only reads your document. Every number comes from a tested tax engine with IRS-sourced parameters."],
  [
    "Documents never stored by us",
    "Your file is read in memory by Claude through Anthropic's commercial API, then discarded. We never extract or save your SSN. Anthropic doesn't train on API data and deletes it within 30 days.",
  ],
  [
    "Field-level encryption",
    "Each family's data is encrypted with its own key. We never store that key: it is rebuilt for each request from a secret kept in your browser and our server key. A copy of our database alone is unreadable.",
  ],
  ["Delete anytime", "One click removes everything. Inactive data is erased automatically after 30 days."],
];

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
      </section>

      <section className="mt-12" id="pricing">
        <h2 className="text-2xl font-semibold text-slate-900">Pricing</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_190px]">
          <Card>
            <h3 className="font-semibold text-slate-900">Free</h3>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">$0</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>One pay stub checkup: every mistake in dollars</li>
              <li>April projection: owe or refund</li>
            </ul>
            <ButtonLink href="/check" variant="secondary" className="mt-6 w-full">
              Start free
            </ButtonLink>
          </Card>
          <Card className="border-brand-500">
            <h3 className="font-semibold text-slate-900">Annual</h3>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
              $99<span className="text-base font-medium text-slate-500">/year</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>Every pay stub, both earners, all year</li>
              <li>April projection and W-4 fixes per job</li>
              <li>January checklist, W-2 reconciliation, accountant packet</li>
            </ul>
            {/* Checkout starts from a household's report; from the landing page this shows Annual on the sample household. */}
            <ButtonLink href="/demo/couple" className="mt-6 w-full">
              See everything in Annual
            </ButtonLink>
          </Card>
          {/* Mirrored so she points left, at the Annual card. */}
          <Image
            src="/illustrations/annual-guide.webp"
            alt="Illustration: a woman holding her pay stubs points to the Annual plan"
            width={400}
            height={531}
            className="hidden h-auto w-[190px] -scale-x-100 self-end lg:block"
          />
        </div>
      </section>
    </div>
  );
}
