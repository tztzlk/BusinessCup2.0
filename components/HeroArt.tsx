import { CheckArt, PayStubArt, W2Art } from "./PaperArt";
import { IconCheckCircle } from "./Icons";

/** The sample pay stub being checked, with the paycheck and W-2 behind it. The check runs once. */
export function HeroStack() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[330px] w-[280px] sm:h-[380px] sm:w-[320px]">
      <div className="absolute -left-10 top-6 w-[250px] -rotate-[10deg] sm:-left-6 sm:w-[280px] lg:-left-10 lg:w-[300px]">
        <CheckArt className="w-full rounded-xl shadow-xl shadow-black/30" />
      </div>
      <div className="absolute -right-8 bottom-2 w-[210px] rotate-[9deg] sm:-right-14 sm:w-[250px]">
        <W2Art className="w-full rounded-lg shadow-xl shadow-black/30" />
      </div>
      <div className="absolute left-1/2 top-1/2 w-[230px] -translate-x-1/2 -translate-y-1/2 -rotate-3 sm:w-[260px]">
        <PayStubArt scan className="w-full rounded-[14px] shadow-xl shadow-black/40 ring-1 ring-white/10" />
        <div className="stub-tag absolute -right-6 top-[26%] rounded-md bg-rose-600 px-2.5 py-1 font-mono text-xs font-medium text-white sm:-right-10">
          Overtime at 1× · $100 short
        </div>
        <div className="stub-ok absolute -left-6 bottom-[14%] flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 sm:-left-10">
          <IconCheckCircle className="h-3.5 w-3.5" /> Taxes check out
        </div>
      </div>
    </div>
  );
}

// Real findings from the sample households (lib/demo.ts and the sample pay stub), not marketing numbers.
const CATCHES = [
  ["Overtime paid at 1× instead of 1.5×", "$100 per paycheck"],
  ["Both jobs left W-4 Step 2 unchecked", "~$7,573 owed in April"],
  ["Free 401(k) match left on the table", "$3,120 a year"],
  ["W-2 box 12 D doesn't match pay stubs", "$1,560"],
  ["401(k) set 1% below the full match", "$475 a year"],
];

/** What the checks catch on the sample households, as a plain list. */
export function CatchList() {
  return (
    <section aria-labelledby="catches" className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <h2 id="catches" className="text-sm font-medium text-slate-900">
          What the checks found on the sample households
        </h2>
        <p className="text-xs text-slate-500">Fictional data. Your numbers come from your own pay stubs.</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {CATCHES.map(([what, amount]) => (
          <li key={what} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
            <span className="flex items-center gap-2.5 text-slate-700">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
              {what}
            </span>
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-slate-900">{amount}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
