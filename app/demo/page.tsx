import Link from "next/link";
import { Badge, Card } from "@/components/ui";

export default function DemoPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Try PayTrail with a sample household</h1>
      <p className="mt-2 text-slate-600">
        These households are fictional. Pick one to see the full checkup — no upload, no sign-up.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/demo/couple" className="group">
          <Card className="h-full border-brand-300 transition-shadow group-hover:shadow-md">
            <Badge tone="info">Start here</Badge>
            <h2 className="mt-3 font-semibold text-slate-900">Alex &amp; Jordan — two incomes, Texas</h2>
            <p className="mt-2 text-sm text-slate-600">
              Both work salaried jobs, neither checked Step 2 on their W-4. Will they owe in April? What should they change?
            </p>
            <p className="mt-4 text-sm font-medium text-brand-700 group-hover:underline">Open the checkup →</p>
          </Card>
        </Link>
        <Link href="/check" className="group">
          <Card className="h-full transition-shadow group-hover:shadow-md">
            <Badge>Your data</Badge>
            <h2 className="mt-3 font-semibold text-slate-900">Check your own pay stub</h2>
            <p className="mt-2 text-sm text-slate-600">
              Upload a PDF or a photo of a pay stub or W-2. You confirm every field before anything is saved.
            </p>
            <p className="mt-4 text-sm font-medium text-brand-700 group-hover:underline">Upload a document →</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
