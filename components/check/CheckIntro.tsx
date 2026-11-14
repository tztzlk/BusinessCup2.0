"use client";

import type { ComponentType, SVGProps } from "react";
import { Button } from "../ui";
import { PayStubArt } from "../PaperArt";
import { IconArrowRight, IconBriefcase, IconCheckCircle, IconClock, IconFileText, IconHousehold, IconLock, IconUpload } from "../Icons";

// First screen of /check for a new visitor: what happens, what to have ready, how data is handled.

const STEPS: Array<{ icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; text: string }> = [
  { icon: IconHousehold, title: "Tell us about your household", text: "Filing status, children, state. 4 quick questions." },
  { icon: IconBriefcase, title: "Add your job", text: "Pay, overtime and 401(k) match. Your spouse's job too, if they work." },
  { icon: IconUpload, title: "Upload a pay stub", text: "A PDF or a phone photo. We read the numbers for you." },
  { icon: IconCheckCircle, title: "Confirm and get your report", text: "You check every number, then see what's wrong and what April looks like." },
];

export function CheckIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[1fr_220px]">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">How it works</h2>
          <ol className="mt-5 space-y-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-4">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-slate-900">
                    <span className="mr-1.5 font-mono text-sm text-slate-400">{i + 1}</span>
                    {title}
                  </p>
                  <p className="text-sm text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div aria-hidden className="relative hidden items-center justify-center md:flex">
          <PayStubArt scan className="relative w-full rotate-[-3deg] rounded-[14px] shadow-md ring-1 ring-slate-200" />
        </div>
      </div>

      <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-sm text-slate-700 sm:grid-cols-3 sm:px-8">
        <p className="flex items-center gap-2">
          <IconClock className="h-4 w-4 shrink-0 text-brand-600" /> About 3 minutes
        </p>
        <p className="flex items-center gap-2">
          <IconFileText className="h-4 w-4 shrink-0 text-brand-600" /> Have a recent pay stub ready
        </p>
        <p className="flex items-center gap-2">
          <IconLock className="h-4 w-4 shrink-0 text-brand-600" /> No sign-up. Files are never stored
        </p>
      </div>

      <div className="px-5 py-5 sm:px-8">
        <Button type="button" onClick={onStart} className="w-full px-6 py-3 text-base sm:w-auto">
          Start my checkup <IconArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
