"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { ButtonLink, Card, Notice } from "@/components/ui";

// Stripe redirects here with ?session_id=cs_... The server verifies the session with Stripe
// before unlocking Annual.
export function BillingSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [error, setError] = useState<string | null>(sessionId ? null : "Missing payment reference.");

  useEffect(() => {
    if (!sessionId) return;
    api
      .confirmCheckout(sessionId)
      .then(() => router.replace("/report?upgraded=1"))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not confirm the payment."));
  }, [sessionId, router]);

  if (!error) return <p className="text-slate-500">Confirming your payment…</p>;
  return (
    <Card className="mx-auto max-w-xl text-center">
      <h1 className="text-xl font-semibold text-slate-900">We couldn&apos;t confirm the payment</h1>
      <div className="mt-3">
        <Notice tone="danger">{error}</Notice>
      </div>
      <div className="mt-5">
        <ButtonLink href="/report">Back to my report</ButtonLink>
      </div>
    </Card>
  );
}
