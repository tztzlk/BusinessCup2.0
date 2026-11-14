import "server-only";
import { getDb } from "./db";
import type { Plan } from "./types";

// Stripe Checkout through the REST API (no SDK). Annual plan, $79/year.
// Live keys are refused unless ALLOW_LIVE_PAYMENTS=true, so a judge can never be charged by accident.

export const ANNUAL_PRICE_CENTS = 7900;
const STRIPE = "https://api.stripe.com/v1";

export class BillingError extends Error {
  constructor(
    public readonly code: "billing_unavailable" | "live_payments_disabled" | "stripe_error" | "not_paid" | "wrong_household",
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new BillingError("billing_unavailable", "Payments are not configured yet.", 503);
  if (key.includes("_live_") && process.env.ALLOW_LIVE_PAYMENTS !== "true") {
    throw new BillingError("live_payments_disabled", "Live payments are disabled on this deployment.", 503);
  }
  return key;
}

export const testMode = () => !(process.env.STRIPE_SECRET_KEY ?? "").includes("_live_");

async function stripe<T>(method: "GET" | "POST", path: string, form?: Record<string, string>): Promise<T> {
  const res = await fetch(`${STRIPE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !body) {
    console.error("stripe error", res.status, body?.error?.message);
    throw new BillingError("stripe_error", "Payment provider error. Try again in a minute.", 502);
  }
  return body;
}

interface CheckoutSession {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  client_reference_id: string | null;
}

export async function createCheckout(householdId: string, origin: string): Promise<string> {
  const session = await stripe<CheckoutSession>("POST", "/checkout/sessions", {
    mode: "subscription",
    client_reference_id: householdId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(ANNUAL_PRICE_CENTS),
    "line_items[0][price_data][recurring][interval]": "year",
    "line_items[0][price_data][product_data][name]": "PayTrail Annual",
    "line_items[0][price_data][product_data][description]":
      "Every pay stub for both earners, April projection with W-4 fixes, January tax-season prep and accountant packet.",
    success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/report?checkout=cancelled`,
  });
  if (!session.url) throw new BillingError("stripe_error", "Payment provider did not return a checkout page.", 502);
  return session.url;
}

/** Verifies a completed Checkout Session for this household and activates Annual for one year. */
export async function confirmCheckout(householdId: string, sessionId: string): Promise<Plan> {
  const session = await stripe<CheckoutSession>("GET", `/checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (session.client_reference_id !== householdId) {
    throw new BillingError("wrong_household", "This payment belongs to a different household.", 403);
  }
  if (session.status !== "complete" || session.payment_status === "unpaid") {
    throw new BillingError("not_paid", "Payment is not complete yet.", 402);
  }
  const until = new Date();
  until.setUTCFullYear(until.getUTCFullYear() + 1);
  getDb()
    .prepare("UPDATE households SET plan = 'annual', plan_until = ?, stripe_session_id = ? WHERE id = ?")
    .run(until.toISOString(), session.id, householdId);
  return { tier: "annual", until: until.toISOString() };
}

export function planFor(householdId: string): Plan {
  const row = getDb().prepare("SELECT plan, plan_until FROM households WHERE id = ?").get(householdId) as
    | { plan: "free" | "annual"; plan_until: string | null }
    | undefined;
  if (!row || row.plan !== "annual" || !row.plan_until || row.plan_until < new Date().toISOString()) {
    return { tier: "free", until: null };
  }
  return { tier: "annual", until: row.plan_until };
}
