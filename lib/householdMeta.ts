import type { HouseholdData } from "./types";

// Facts about a household's saved data that the app shell shows. No tax numbers here.

/** When the household last confirmed a document (ISO timestamp), or null if it has none. */
export function lastConfirmedAt(data: Pick<HouseholdData, "documents">): string | null {
  let latest: string | null = null;
  for (const d of data.documents) {
    if (!d.createdAt) continue;
    if (latest === null || Date.parse(d.createdAt) > Date.parse(latest)) latest = d.createdAt;
  }
  return latest;
}
