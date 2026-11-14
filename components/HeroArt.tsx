import { CheckArt, PayStubArt, W2Art } from "./PaperArt";

/** Ghost payroll paper drifting behind the hero copy. */
export function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-16 top-6 w-72 opacity-[0.05] sm:w-96">
        <div className="paper-drift" style={{ ["--r" as string]: "-9deg", animationDuration: "19s" }}>
          <CheckArt className="w-full" />
        </div>
      </div>
      <div className="absolute -bottom-24 left-1/3 hidden w-64 opacity-[0.06] md:block">
        <div className="paper-drift" style={{ ["--r" as string]: "7deg", animationDuration: "23s", animationDelay: "-6s" }}>
          <PayStubArt className="w-full" />
        </div>
      </div>
      <div className="absolute -right-20 -top-10 w-80 opacity-[0.06] lg:right-40">
        <div className="paper-drift" style={{ ["--r" as string]: "11deg", animationDuration: "21s", animationDelay: "-3s" }}>
          <W2Art className="w-full" />
        </div>
      </div>
      <div className="absolute -left-10 bottom-0 w-60 opacity-[0.05] sm:w-80">
        <div className="paper-drift" style={{ ["--r" as string]: "4deg", animationDuration: "25s", animationDelay: "-11s" }}>
          <W2Art className="w-full" />
        </div>
      </div>
    </div>
  );
}

/** Foreground: the sample pay stub being checked, with the paycheck and W-2 behind it. */
export function HeroStack() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[330px] w-[280px] sm:h-[380px] sm:w-[320px]">
      <div className="absolute -left-10 top-6 w-[250px] sm:-left-6 sm:w-[280px] lg:-left-10 lg:w-[300px]">
        <div className="paper-drift" style={{ ["--r" as string]: "-10deg", animationDuration: "14s" }}>
          <CheckArt className="w-full rounded-xl shadow-2xl shadow-black/40" />
        </div>
      </div>
      <div className="absolute -right-8 bottom-2 w-[210px] sm:-right-14 sm:w-[250px]">
        <div className="paper-drift" style={{ ["--r" as string]: "9deg", animationDuration: "16s", animationDelay: "-5s" }}>
          <W2Art className="w-full rounded-lg shadow-2xl shadow-black/40" />
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 w-[230px] -translate-x-1/2 -translate-y-1/2 sm:w-[260px]">
        <div className="paper-drift" style={{ ["--r" as string]: "-3deg", animationDuration: "12s", animationDelay: "-2s" }}>
          <PayStubArt scan className="w-full rounded-[14px] shadow-2xl shadow-black/50 ring-1 ring-white/10" />
          <div className="stub-tag absolute -right-6 top-[26%] rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-rose-900/40 sm:-right-10">
            Overtime at 1× · $100 short
          </div>
          <div className="stub-ok absolute -left-6 bottom-[14%] rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-emerald-900/40 sm:-left-10">
            Taxes check out ✓
          </div>
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
