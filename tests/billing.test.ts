import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.ALLOW_LIVE_PAYMENTS;
  vi.unstubAllGlobals();
});

describe("billing guards", () => {
  it("reports billing as unavailable without a key", async () => {
    const { createCheckout } = await import("../lib/billing");
    await expect(createCheckout("hh", "https://x")).rejects.toMatchObject({ code: "billing_unavailable" });
  });

  it("refuses live keys unless explicitly allowed", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_123";
    const { createCheckout } = await import("../lib/billing");
    await expect(createCheckout("hh", "https://x")).rejects.toMatchObject({ code: "live_payments_disabled" });
  });

  it("sends an annual $79 subscription bound to the household", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.com/x" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { createCheckout } = await import("../lib/billing");
    expect(await createCheckout("hh_1", "https://paytrail.example")).toBe("https://checkout.stripe.com/x");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const form = new URLSearchParams(String(init.body));
    expect(form.get("mode")).toBe("subscription");
    expect(form.get("client_reference_id")).toBe("hh_1");
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("7900");
    expect(form.get("line_items[0][price_data][recurring][interval]")).toBe("year");
    expect(form.get("success_url")).toBe("https://paytrail.example/billing/success?session_id={CHECKOUT_SESSION_ID}");
  });

  it("rejects a session that belongs to another household", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "cs_test_1", status: "complete", payment_status: "paid", client_reference_id: "other" }), { status: 200 })));
    const { confirmCheckout } = await import("../lib/billing");
    await expect(confirmCheckout("hh_1", "cs_test_1")).rejects.toMatchObject({ code: "wrong_household" });
  });

  it("rejects an unpaid session", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ id: "cs_test_1", status: "open", payment_status: "unpaid", client_reference_id: "hh_1" }), { status: 200 })));
    const { confirmCheckout } = await import("../lib/billing");
    await expect(confirmCheckout("hh_1", "cs_test_1")).rejects.toMatchObject({ code: "not_paid" });
  });
});
