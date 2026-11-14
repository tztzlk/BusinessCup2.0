import Link from "next/link";
import { Logo } from "./Logo";

// The layout keeps the nav mounted across client navigation, so the logo animates once per visit.
export function Nav() {
  return (
    <header className="no-print sticky top-0 z-20 border-b border-white/10 bg-ink/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-brand-400">
          <Logo size={26} animate />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/demo" className="rounded-md px-2.5 py-1.5 text-brand-100 hover:bg-white/10 sm:px-3">
            Demo
          </Link>
          <Link href="/report" className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-brand-100 hover:bg-white/10 sm:px-3">
            My report
          </Link>
          <Link
            href="/check"
            className="whitespace-nowrap rounded-md bg-brand-500 px-3 py-1.5 font-medium text-white hover:bg-brand-400"
          >
            <span className="sm:hidden">Check</span>
            <span className="hidden sm:inline">Check a stub</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
