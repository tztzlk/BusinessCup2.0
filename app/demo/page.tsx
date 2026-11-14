import Link from "next/link";
import { Badge, Card } from "@/components/ui";

const SOON = [
  { title: "Sam — hourly, Texas", body: "Works overtime most weeks. Is overtime paid at 1.5× for every hour over 40?" },
  { title: "Riley — salaried", body: "Contributes 2% to the 401(k) while the employer matches up to 6%. How much is left on the table?" },
];

export default function DemoPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Try PayTrail with a sample household</h1>
      <p className="mt-2 text-slate-600">
        These households are fictional. Pick one to see the full checkup — no upload, no sign-up.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/demo/couple" className="group">
          <Card className="h-full border-indigo-300 transition-shadow group-hover:shadow-md">
            <Badge tone="info">Start here</Badge>
            <h2 className="mt-3 font-semibold text-slate-900">Alex &amp; Jordan — two incomes, Texas</h2>
            <p className="mt-2 text-sm text-slate-600">
              Both work salaried jobs, neither checked Step 2 on their W-4. Will they owe in April? What should they change?
            </p>
            <p className="mt-4 text-sm font-medium text-indigo-700 group-hover:underline">Open the checkup →</p>
          </Card>
        </Link>
        {SOON.map((p) => (
          <Card key={p.title} className="h-full opacity-70">
            <Badge>Coming soon</Badge>
            <h2 className="mt-3 font-semibold text-slate-900">{p.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{p.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
