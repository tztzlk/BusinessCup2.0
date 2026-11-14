"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, ButtonLink, Card, Notice, Section } from "@/components/ui";
import { HouseholdSummary } from "@/components/report";
import { ReportEngineSection } from "@/components/ReportEngineSection";
import { ProfileForm } from "@/components/ProfileForm";
import { EmployerForm } from "@/components/EmployerForm";
import { SaveLinkCard } from "@/components/SaveLinkCard";
import { money, shortDate } from "@/lib/format";
import type { EmploymentSettings, HouseholdData, Paystub, W2 } from "@/lib/types";

// The job id travels in the URL, not in the body.
function withoutId(e: EmploymentSettings): Omit<EmploymentSettings, "id"> {
  const settings: Partial<EmploymentSettings> = { ...e };
  delete settings.id;
  return settings as Omit<EmploymentSettings, "id">;
}

export function ReportView() {
  const router = useRouter();
  const [data, setData] = useState<HouseholdData | null>(null);
  const [state, setState] = useState<"loading" | "none" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingEmployer, setEditingEmployer] = useState<string | null>(null);
  const [confirmingDoc, setConfirmingDoc] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<"upgraded" | "cancelled" | null>(null);

  // Stripe returns here with ?upgraded=1 (after /billing/success) or ?checkout=cancelled.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("upgraded") === "1") setCheckoutNotice("upgraded");
    else if (q.get("checkout") === "cancelled") setCheckoutNotice("cancelled");
  }, []);

  useEffect(() => {
    api
      .getHousehold()
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) setState("none");
        else {
          setError(e instanceof Error ? e.message : "Could not load your data.");
          setState("error");
        }
      });
  }, []);

  if (state === "loading") return <p className="text-slate-500">Loading…</p>;
  if (state === "error") return <Notice tone="danger">{error}</Notice>;
  if (state === "none" || !data)
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-xl font-bold text-slate-900">No saved data in this browser</h1>
        <p className="mt-2 text-sm text-slate-600">
          Start a checkup, or open your private recovery link if you saved one.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/check">Check my pay stub</ButtonLink>
          <ButtonLink href="/demo" variant="secondary">
            See the demo
          </ButtonLink>
        </div>
      </Card>
    );


  const editingEmployerSettings = data.employers.find((e) => e.id === editingEmployer) ?? null;
  const employerName = (id: string | null) => data.employers.find((e) => e.id === id)?.employerName ?? "Unassigned";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-slate-900">
            My report
            <Badge tone={data.plan?.tier === "annual" ? "success" : "neutral"}>
              {data.plan?.tier === "annual" ? "Annual" : "Free plan"}
            </Badge>
          </h1>
          <p className="text-slate-600">Everything below is stored encrypted and tied to this browser.</p>
        </div>
        <ButtonLink href="/check">Add a document</ButtonLink>
      </div>
      {error && (
        <div className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
      {checkoutNotice === "upgraded" && data.plan?.tier === "annual" && (
        <div className="mt-4">
          <Notice tone="success">
            <span className="font-medium">Annual is active{data.plan.until ? ` until ${shortDate(data.plan.until)}` : ""}.</span>{" "}
            Add every pay stub for both of you; the W-4 fix, tax season and reminders are now open.
          </Notice>
          <div className="mt-3">
            <SaveLinkCard annual prominent />
          </div>
        </div>
      )}
      {checkoutNotice === "cancelled" && (
        <div className="mt-4">
          <Notice tone="neutral">Checkout was cancelled. Nothing was charged.</Notice>
        </div>
      )}

      <ReportEngineSection data={data} onChanged={() => api.getHousehold().then(setData).catch(() => undefined)} />

      <Section
        title="Household"
        subtitle={
          editingProfile
            ? "Changes update your projection and the forms to expect in January."
            : editingEmployer
              ? "Pay, 401(k) match and W-4 for this job. Your findings and projection update when you save."
              : undefined
        }
        action={
          !editingProfile && !editingEmployer && (
            <Button type="button" variant="secondary" onClick={() => setEditingProfile(true)}>
              Edit profile
            </Button>
          )
        }
      >
        {editingProfile ? (
          <Card>
            <ProfileForm
              initial={data.profile}
              submitLabel="Save profile"
              onCancel={() => setEditingProfile(false)}
              onSubmit={async (profile) => {
                await api.saveProfile(profile);
                setData(await api.getHousehold());
                setEditingProfile(false);
              }}
            />
          </Card>
        ) : editingEmployerSettings ? (
          <Card>
            <EmployerForm
              key={editingEmployerSettings.id}
              initial={withoutId(editingEmployerSettings)}
              notMarried={data.profile.filingStatus === "single" || data.profile.filingStatus === "head_of_household"}
              submitLabel="Save job"
              onCancel={() => setEditingEmployer(null)}
              onSubmit={async (settings) => {
                await api.updateEmployer(editingEmployerSettings.id, settings);
                setData(await api.getHousehold());
                setEditingEmployer(null);
              }}
            />
          </Card>
        ) : (
          <HouseholdSummary
            profile={data.profile}
            employers={data.employers}
            documents={data.documents}
            onEditEmployer={(id) => {
              setEditingProfile(false);
              setEditingEmployer(id);
            }}
          />
        )}
      </Section>

      <Section title="Documents" subtitle="Confirmed fields only — original files are never stored.">
        {data.documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents yet.</p>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-slate-100">
              {data.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={d.docType === "w2" ? "info" : "neutral"}>{d.docType === "w2" ? "W-2" : "Pay stub"}</Badge>
                      <span className="font-medium text-slate-900">{employerName(d.employerId)}</span>
                    </div>
                    <p className="mt-1 text-slate-500">
                      {d.docType === "paystub"
                        ? `Paid ${shortDate((d.fields as Paystub).payDate)}`
                        : `Tax year ${(d.fields as W2).taxYear}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-slate-800">
                      {d.docType === "paystub" ? `${money((d.fields as Paystub).grossCurrent)} gross` : `${money((d.fields as W2).box1Wages)} box 1`}
                    </p>
                    {confirmingDoc !== d.id && (
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-50"
                        aria-label={`Delete ${d.docType === "w2" ? "W-2" : "pay stub"} from ${employerName(d.employerId)}`}
                        onClick={() => setConfirmingDoc(d.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {confirmingDoc === d.id && (
                    <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-sm text-red-900">
                        Delete this {d.docType === "w2" ? "W-2" : "pay stub"}? Your findings and projection will be recalculated without it.
                      </p>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="danger"
                          disabled={deletingDoc}
                          onClick={async () => {
                            setDeletingDoc(true);
                            setError(null);
                            try {
                              await api.deleteDocument(d.id);
                              setData(await api.getHousehold());
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Could not delete the document.");
                            } finally {
                              setDeletingDoc(false);
                              setConfirmingDoc(null);
                            }
                          }}
                        >
                          {deletingDoc ? "Deleting…" : "Yes, delete it"}
                        </Button>
                        <Button type="button" variant="secondary" disabled={deletingDoc} onClick={() => setConfirmingDoc(null)}>
                          Keep it
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>


      <Section title="Your data">
        {!(checkoutNotice === "upgraded" && data.plan?.tier === "annual") && (
          <div className="mb-4">
            <SaveLinkCard annual={data.plan?.tier === "annual"} />
          </div>
        )}
        <Card>
          <p className="text-sm text-slate-600">
            Deleting removes your household, jobs, documents and checklist from our servers immediately. This can&apos;t be undone.
          </p>
          {confirmingDelete ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">Delete everything now? Your private link will stop working too.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="danger"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await api.deleteHousehold();
                      router.push("/");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Could not delete.");
                      setDeleting(false);
                      setConfirmingDelete(false);
                    }
                  }}
                >
                  {deleting ? "Deleting…" : "Yes, delete my data"}
                </Button>
                <Button type="button" variant="secondary" disabled={deleting} onClick={() => setConfirmingDelete(false)}>
                  Keep my data
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="danger" className="mt-4" onClick={() => setConfirmingDelete(true)}>
              Delete my data
            </Button>
          )}
        </Card>
      </Section>
    </div>
  );
}
