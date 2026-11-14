import Link from "next/link";
import { LogoMark } from "./Logo";

export const DISCLAIMER = "Estimates only. Not tax advice. Not affiliated with the IRS.";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/accuracy", label: "Accuracy and limits" },
  { href: "/demo", label: "Sample reports" },
  { href: "/about", label: "About" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-slate-600">{DISCLAIMER}</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="flex items-center gap-2">
          <LogoMark size={16} className="text-ink" />
          PayTrail · Built at Business Cup 2.0 by team ENUshniki
        </p>
      </div>
    </footer>
  );
}
