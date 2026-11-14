import type {
  ChecklistStatus,
  EmploymentSettings,
  ExtractResult,
  HouseholdData,
  HouseholdProfile,
  Plan,
  Paystub,
  W2,
} from "./types";
import type { ExplainRequest, ExplainResponse } from "./explain";

// Typed browser-side wrappers for the PayTrail API. Cookies are same-origin.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const FRIENDLY: Record<string, string> = {
  bad_type: "Upload a PDF, JPG, PNG or WebP. iPhone HEIC photos: export as JPG first.",
  bad_size: "File must be under 10 MB.",
  no_file: "Choose a file to upload.",
  rate_limited: "Too many requests. Try again in a few minutes.",
  refused: "This document could not be processed. Try a different file.",
  unreadable: "We couldn't read this document. Try a sharper photo or the PDF.",
  truncated: "The document is too long to read. Upload a single pay stub or W-2.",
  upstream: "Our document reader is unavailable right now. Try again shortly.",
  busy: "Our document reader is busy. Try again in a minute.",
  no_household: "No saved household in this browser yet.",
  internal: "Something went wrong on our side. Try again.",
  payment_required: "This is part of Annual. Unlock Annual to continue.",
  billing_unavailable: "Payments are not set up on this deployment yet.",
  live_payments_disabled: "Live payments are disabled on this deployment.",
  stripe_error: "Payment provider error. Try again in a minute.",
  not_paid: "The payment is not complete yet.",
  wrong_household: "This payment belongs to a different household.",
  invalid_document: "Some fields look invalid. Check them and try again.",
  invalid_employer: "Some job details look invalid. Check them and try again.",
  invalid_profile: "Some household details look invalid. Check them and try again.",
  invalid_checklist: "The checklist could not be saved. Reload the page and try again.",
  invalid_status: "That status is not valid.",
  invalid_session: "This payment link is not valid. Start checkout again.",
  invalid_secret: "This recovery link is incomplete. Copy the whole link and try again.",
  not_found: "Nothing was found for this link. It may have been deleted.",
  unknown_employer: "That job is no longer in your household. Reload the page and pick a job again.",
  too_many_employers: "A household can have up to 4 jobs.",
  forbidden: "This request was blocked. Reload the page and try again.",
  unsupported_media_type: "Something went wrong sending your data. Reload the page and try again.",
  too_large: "That's too much data to send at once.",
  too_many_pages: "Upload a single pay stub or W-2 (up to 5 pages).",
  image_too_large: "Photos must be under 7 MB. Try a smaller photo or the PDF.",
};

const fieldLabel = (path: unknown): string | null =>
  Array.isArray(path) && path.length > 0 ? path.filter((p) => typeof p === "string").join(" › ") || null : null;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiError(0, "network", "Network error. Check your connection and try again.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const code: string = body?.error ?? "internal";
    // Our wording wins for reader and network errors; the server's own message is more specific for plan limits.
    const preferServer = code === "payment_required" && typeof body?.message === "string";
    let message: string = (preferServer ? body.message : FRIENDLY[code]) ?? body?.message ?? FRIENDLY.internal;
    // Validation errors name the first field that failed, so the user knows what to fix.
    const field = res.status === 400 && Array.isArray(body?.issues) ? fieldLabel(body.issues[0]?.path) : null;
    if (field) message = `${message} (field: ${field})`;
    throw new ApiError(res.status, code, message);
  }
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

export const api = {
  getHousehold: () => request<HouseholdData>("/api/household"),
  createHousehold: (profile: HouseholdProfile) =>
    request<{ householdId: string; recoveryUrl: string }>("/api/household", json("POST", { profile })),
  saveProfile: (profile: HouseholdProfile) => request<{ ok: true }>("/api/household/profile", json("PUT", profile)),
  deleteHousehold: () => request<{ deleted: true }>("/api/household", { method: "DELETE" }),
  recover: (secret: string) => request<{ restored: true }>("/api/household/recover", json("POST", { secret })),
  addEmployer: (settings: Omit<EmploymentSettings, "id">) =>
    request<{ id: string }>("/api/employers", json("POST", settings)),
  explain: (body: ExplainRequest) => request<ExplainResponse>("/api/explain", json("POST", body)),
  extract: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ExtractResult>("/api/extract", { method: "POST", body: form });
  },
  addDocument: (doc: { docType: "paystub"; employerId: string | null; taxYear: number; fields: Paystub } | {
    docType: "w2";
    employerId: string | null;
    taxYear: number;
    fields: W2;
  }) => request<{ id: string }>("/api/documents", json("POST", doc)),
  saveChecklist: (items: Array<{ formType: string; source: string; status: ChecklistStatus; dueDate: string | null }>) =>
    request<{ ids: string[] }>("/api/checklist", json("POST", items)),
  startCheckout: () => request<{ url: string }>("/api/billing/checkout", { method: "POST" }),
  confirmCheckout: (sessionId: string) =>
    request<{ plan: Plan }>("/api/billing/confirm", json("POST", { sessionId })),
  setChecklistStatus: (id: string, status: ChecklistStatus) =>
    request<{ ok: true }>(`/api/checklist/${encodeURIComponent(id)}`, json("PATCH", { status })),
};
