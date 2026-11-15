import { CheckArt, PayStubArt, W2Art } from "./PaperArt";
import { CircleCheckIcon } from "lucide-react";

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
          <CircleCheckIcon className="h-3.5 w-3.5" /> Taxes check out
        </div>
      </div>
    </div>
  );
}

// Real findings from the sample households (lib/demo.ts and the sample pay stub), not marketing numbers.
const CATCHES = [
  ["Overtime paid at 1× instead of 1.5×", "$100 per paycheck"],
  ["Both jobs left W-4 Step 2 unchecked", "owe ~$7,573 in April"],
  ["Free 401(k) match left on the table", "$3,120 a year"],
  ["W-2 box 12 D doesn't match pay stubs", "$1,560"],
  ["401(k) set 1% below the full match", "$475 a year"],
];

/** A slow ticker of what the checks catch on the sample households. */
export function CatchTicker() {
  const items = [...CATCHES, ...CATCHES];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white py-3 shadow-sm">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white" />
      <ul className="ticker flex w-max gap-3 px-3" aria-label="What PayTrail caught on the sample households">
        {items.map(([what, amount], i) => (
          <li
            key={i}
            aria-hidden={i >= CATCHES.length}
            className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-slate-700">{what}</span>
            <span className="font-semibold text-slate-900">{amount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
