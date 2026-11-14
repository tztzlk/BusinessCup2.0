import Link from "next/link";

export function Nav() {
  return (
    <header className="no-print border-b border-indigo-950/10 bg-indigo-950 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Pay<span className="text-indigo-300">Trail</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/demo" className="rounded-md px-3 py-1.5 text-indigo-100 hover:bg-white/10">
            Demo
          </Link>
          <Link href="/report" className="rounded-md px-3 py-1.5 text-indigo-100 hover:bg-white/10">
            My report
          </Link>
          <Link href="/check" className="rounded-md bg-indigo-500 px-3 py-1.5 font-medium hover:bg-indigo-400">
            Check a stub
          </Link>
        </nav>
      </div>
    </header>
  );
}
