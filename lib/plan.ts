import type { HouseholdData } from "./types";

// What the free plan includes. One place, so the API and the UI agree.
export const FREE_LIMITS = { paystubs: 1, w2s: 0 } as const;

export const ANNUAL_PRICE_LABEL = "$79/year";

/** Demo data has no plan and shows everything; real households are locked until Annual. */
export function isAnnual(data: HouseholdData): boolean {
  return data.plan === undefined || data.plan.tier === "annual";
}
