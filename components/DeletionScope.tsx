import Link from "next/link";

// What "Delete my data" removes. Shared by /report and /account, and kept in line with
// lib/household.ts deleteHousehold(), lib/browserData.ts and /privacy#deletion.
const REMOVED = [
  "Household profile and jobs",
  "Every saved pay stub and W-2",
  "Tax-form checklist and plan record",
  "Your entries in our security log",
  "The sign-in cookie and cached explanations in this browser",
];

export function DeletionScope() {
  return (
    <div className="text-sm text-slate-600">
      <p>Deleting removes, immediately and for good:</p>
      <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {REMOVED.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-2">
        Your private link stops working. Copies in our host&apos;s encrypted disk snapshots expire within 5 days. Households nobody
        opens for 30 days are erased automatically.{" "}
        <Link href="/privacy#deletion" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900">
          How deletion works
        </Link>
      </p>
    </div>
  );
}
