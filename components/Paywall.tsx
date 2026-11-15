"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { ANNUAL_PRICE_LABEL } from "@/lib/plan";
import { CircleCheckIcon } from "lucide-react";
import { Button, Card, Alert } from "./ui";

export const ANNUAL_FEATURES = [
  "Every pay stub for both earners, all year",
  "The exact W-4 Step 4(c) fix for each job",
  "January: tax-document checklist, W-2 reconciliation, accountant packet",
  "Calendar reminders for paydays and tax-form due dates",
];

// Stripe Checkout in test mode: no real money moves. The test card is shown so judges can pass it.
export function Paywall({ title, reason }: { title: string; reason: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.startCheckout();
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout.");
      setBusy(false);
    }
  };

  return (
    <Card className="no-print border-brand-500">
      <p className="text-sm font-medium text-brand-700">Annual · {ANNUAL_PRICE_LABEL}</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{reason}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
        {ANNUAL_FEATURES.map((f) => (
          <li key={f} className="flex gap-2.5">
            <CircleCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            {f}
          </li>
        ))}
      </ul>
      <Button type="button" className="mt-5 w-full sm:w-auto" disabled={busy} onClick={unlock}>
        {busy ? "Opening checkout…" : `Get Annual — ${ANNUAL_PRICE_LABEL}`}
      </Button>
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        Test mode, no real charge. Card <span className="font-mono font-semibold">4242 4242 4242 4242</span>, any future
        expiry date, any CVC, any ZIP.
      </p>
      {error && (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
    </Card>
  );
}
