import { Suspense } from "react";
import { BillingSuccess } from "./BillingSuccess";

export const metadata = { title: "Payment — PayTrail" };

export default function Page() {
  return (
    <Suspense fallback={<p className="text-slate-500">Confirming your payment…</p>}>
      <BillingSuccess />
    </Suspense>
  );
}
