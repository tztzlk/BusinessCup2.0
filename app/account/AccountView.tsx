"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, ButtonLink, Card, Notice, Section } from "@/components/ui";
import { ProfileForm } from "@/components/ProfileForm";
import { EmployerForm } from "@/components/EmployerForm";
import { SaveLinkCard } from "@/components/SaveLinkCard";
import { Paywall } from "@/components/Paywall";
import { IconBriefcase, IconCheckCircle, IconFileText, IconHousehold, IconLock, IconPerson } from "@/components/Icons";
import { money, shortDate } from "@/lib/format";
import { ANNUAL_PRICE_LABEL } from "@/lib/plan";
import type { EmploymentSettings, HouseholdData, HouseholdProfile } from "@/lib/types";

// The household's account page: plan, how to sign in on another device, profile, jobs and data.
// There is no password: this browser's cookie and the private link are the keys.

const FILING: Record<HouseholdProfile["filingStatus"], string> = {
  married_joint: "Married filing jointly",
  single: "Single",
  head_of_household: "Head of household",
  married_separate: "Married filing separately",
};

const EXTRAS: Record<keyof HouseholdProfile["flags"], string> = {
  mortgage: "Mortgage",
  bankInterest: "Savings with interest",
  brokerage: "Brokerage account",
  hsa: "HSA",
};

function withoutId(e: EmploymentSettings): Omit<EmploymentSettings, "id"> {
  const settings: Partial<EmploymentSettings> = { ...e };
  delete settings.id;
  return settings as Omit<EmploymentSettings, "id">;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export function AccountView() {
  const router = useRouter();
  const [data, setData] = useState<HouseholdData | null>(null);
  const [state, setState] = useState<"loading" | "none" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<"profile" | string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => setData(await api.getHousehold());

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
          setError(e instanceof Error ? e.message : "Could not load your account.");
          setState("error");
        }
      });
  }, []);

  if (state === "loading") return <p className="text-slate-500">Loading…</p>;
  if (state === "error") return <Notice tone="danger">{error}</Notice>;
  if (state === "none" || !data)
    return (
      <Card className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <IconPerson className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">No account in this browser yet</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account is created when you check your first pay stub. Already have one? Open your private link on this device to
          sign in.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/check">Check my pay stub</ButtonLink>
          <ButtonLink href="/demo" variant="secondary">
            See a sample household
          </ButtonLink>
        </div>
      </Card>
    );

  const annual = data.plan?.tier === "annual";
  const p = data.profile;
  const stubs = data.documents.filter((d) => d.docType === "paystub").length;
  const w2s = data.documents.filter((d) => d.docType === "w2").length;
  const extras = (Object.keys(EXTRAS) as Array<keyof HouseholdProfile["flags"]>).filter((k) => p.flags[k]).map((k) => EXTRAS[k]);
  const job = data.employers.find((e) => e.id === editing) ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white">
          <IconHousehold className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold text-slate-900">
            My account
            <Badge tone={annual ? "success" : "neutral"}>{annual ? "Annual" : "Free plan"}</Badge>
          </h1>
          <p className="text-slate-600">
            {FILING[p.filingStatus]} · {p.state} · {data.employers.length} job{data.employers.length === 1 ? "" : "s"}
          </p>
        </div>
        <ButtonLink href="/report" variant="secondary" className="sm:ml-auto">
          Open my report
        </ButtonLink>
      </div>

      {error && (
        <div className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      <Section title="Plan">
        {annual ? (
          <Card>
            <div className="flex items-start gap-3">
              <IconCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-medium text-slate-900">
                  Annual · {ANNUAL_PRICE_LABEL}
                  {data.plan?.until ? `, active until ${shortDate(data.plan.until)}` : ""}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Every pay stub for both of you, the exact W-4 fix for each job, tax season and calendar reminders.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Paywall
            title="You're on the free plan"
            reason="It checks one pay stub and shows your April projection. Annual checks every paycheck for both of you, all year."
          />
        )}
      </Section>

      <Section title="Sign in on another device" subtitle="There's no password. Your private link is the key to this account.">
        <SaveLinkCard annual={annual} />
        <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
          <IconLock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          Open the link in any browser to sign in there. Anyone with it can see your data, so keep it like a password.
        </p>
      </Section>

      <Section
        title="Household"
        action={
          editing !== "profile" && (
            <Button type="button" variant="secondary" onClick={() => setEditing("profile")}>
              Edit
            </Button>
          )
        }
      >
        {editing === "profile" ? (
          <Card>
            <ProfileForm
              initial={p}
              submitLabel="Save household"
              onCancel={() => setEditing(null)}
              onSubmit={async (profile) => {
                await api.saveProfile(profile);
                await reload();
                setEditing(null);
              }}
            />
          </Card>
        ) : (
          <Card className="py-2">
            <dl className="divide-y divide-slate-100">
              <Row label="Filing status">{FILING[p.filingStatus]}</Row>
              <Row label="State">{p.state}</Row>
              <Row label="Children under 17">{p.dependentsUnder17}</Row>
              <Row label="Other dependents">{p.otherDependents}</Row>
              <Row label="Also has">{extras.join(", ") || "None"}</Row>
            </dl>
          </Card>
        )}
      </Section>

      <Section
        title="Jobs"
        action={
          <ButtonLink href="/check" variant="secondary">
            Add a job
          </ButtonLink>
        }
      >
        {job ? (
          <Card>
            <EmployerForm
              key={job.id}
              initial={withoutId(job)}
              notMarried={p.filingStatus === "single" || p.filingStatus === "head_of_household"}
              submitLabel="Save job"
              onCancel={() => setEditing(null)}
              onSubmit={async (settings) => {
                await api.updateEmployer(job.id, settings);
                await reload();
                setEditing(null);
              }}
            />
          </Card>
        ) : data.employers.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-600">No jobs yet. Add one when you check your first pay stub.</p>
          </Card>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-slate-100">
              {data.employers.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <IconBriefcase className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{e.employerName}</p>
                      <p className="text-sm text-slate-600">
                        {e.member === "self" ? "You" : "Spouse"} ·{" "}
                        {e.payType === "salary" ? `${money(e.annualSalary ?? null, true)} a year` : `${money(e.hourlyRate ?? null)} an hour`}
                        {e.match401k ? ` · 401(k) match ${e.match401k.matchPercent}% up to ${e.match401k.upToPercentOfPay}%` : ""}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setEditing(e.id)} aria-label={`Edit job: ${e.employerName}`}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <Section title="Your data" subtitle="Confirmed fields only, encrypted with this account's key. Original files are never stored.">
        <Card>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700">
            <span className="flex items-center gap-2">
              <IconFileText className="h-4 w-4 text-slate-400" />
              {stubs} pay stub{stubs === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-2">
              <IconFileText className="h-4 w-4 text-slate-400" />
              {w2s} W-2{w2s === 1 ? "" : "s"}
            </span>
            <ButtonLink href="/report" variant="ghost" className="px-0 sm:ml-auto">
              Manage documents in my report
            </ButtonLink>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="text-sm text-slate-600">
              Deleting removes your account immediately: household, jobs, documents, checklist and activity log. Your private link stops working. This can&apos;t be
              undone.
            </p>
            {confirmingDelete ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-900">Delete your account and all its data now?</p>
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
                    {deleting ? "Deleting…" : "Yes, delete my account"}
                  </Button>
                  <Button type="button" variant="secondary" disabled={deleting} onClick={() => setConfirmingDelete(false)}>
                    Keep it
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="danger" className="mt-4" onClick={() => setConfirmingDelete(true)}>
                Delete my account
              </Button>
            )}
          </div>
        </Card>
      </Section>
    </div>
  );
}
