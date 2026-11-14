import type {
  ChecklistStatus,
  EmploymentSettings,
  ExtractResult,
  HouseholdData,
  HouseholdProfile,
  Paystub,
  W2,
} from "./types";

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
};

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
    throw new ApiError(res.status, code, FRIENDLY[code] ?? body?.message ?? FRIENDLY.internal);
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
  setChecklistStatus: (id: string, status: ChecklistStatus) =>
    request<{ ok: true }>(`/api/checklist/${encodeURIComponent(id)}`, json("PATCH", { status })),
};
