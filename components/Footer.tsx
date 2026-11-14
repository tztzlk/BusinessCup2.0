export const DISCLAIMER = "Estimates only. Not tax advice. Not affiliated with the IRS.";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-6">
        <p className="font-medium text-slate-600">{DISCLAIMER}</p>
        <p>PayTrail · Built at Business Cup 2.0 by team ENUshniki</p>
      </div>
    </footer>
  );
}
