import { ButtonLink, Card } from "@/components/ui";

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

const PRIVACY = [
  ["Claude reads, code calculates", "AI only reads your document. Every number comes from a tested tax engine with IRS-sourced parameters."],
  ["Documents never stored", "Your file is processed in memory and discarded. Only the fields you confirm are kept."],
  ["Field-level encryption", "Your data is encrypted with a key that only your browser holds. A copy of our database alone is unreadable."],
  ["Delete anytime", "One click removes everything. Inactive data is erased automatically after 30 days."],
];

export default function Home() {
  return (
    <div>
      <section className="rounded-2xl bg-indigo-950 px-6 py-10 text-white sm:px-10 sm:py-14">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-300">For two-income W-2 households</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
          Catch paycheck mistakes now — not a surprise tax bill in April.
        </h1>
        <p className="mt-4 max-w-2xl text-indigo-100">
          When both of you work, withholding quietly falls short. PayTrail checks every pay stub, tells you what you&apos;ll owe or
          get back, and what to change on your W-4 today.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/demo" className="bg-white !text-indigo-950 hover:bg-indigo-100">
            Try the demo
          </ButtonLink>
          <ButtonLink href="/check" className="bg-indigo-500 hover:bg-indigo-400">
            Check my pay stub
          </ButtonLink>
        </div>
        <p className="mt-4 text-xs text-indigo-300">No sign-up. The demo uses a fictional household.</p>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {VALUE.map((v, i) => (
          <Card key={v.title}>
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
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
              <li>One paycheck checkup</li>
              <li>April projection for one pay stub</li>
            </ul>
            <ButtonLink href="/check" variant="secondary" className="mt-6 w-full">
              Start free
            </ButtonLink>
          </Card>
          <Card className="border-indigo-300 ring-2 ring-indigo-100">
            <h3 className="font-semibold text-slate-900">Annual</h3>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              $79<span className="text-base font-medium text-slate-500">/year</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>Every pay stub, both earners, all year</li>
              <li>April projection and W-4 fixes per job</li>
              <li>January checklist, W-2 reconciliation, accountant packet</li>
            </ul>
            {/* TODO: replace "#" with the Stripe Payment Link (test mode). */}
            <a
              href="#"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Get Annual
            </a>
          </Card>
        </div>
      </section>
    </div>
  );
}
