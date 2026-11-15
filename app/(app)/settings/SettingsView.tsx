"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { BellIcon, BriefcaseIcon, CircleCheckIcon, CreditCardIcon, HouseIcon, PlusIcon, ShieldCheckIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useHousehold } from "@/components/app/HouseholdProvider";
import { DeletionScope } from "@/components/DeletionScope";
import { EmployerForm, newEmployerSettings } from "@/components/EmployerForm";
import { Paywall } from "@/components/Paywall";
import { FILING_LABEL, ProfileForm } from "@/components/ProfileForm";
import { RemindersCard } from "@/components/RemindersCard";
import { SaveLinkCard } from "@/components/SaveLinkCard";
import { DocumentsList } from "@/components/settings/DocumentsList";
import { Alert, Button, ButtonLink, Card, CardHeader, EmptyState, Modal, PageHeader, PageSkeleton, useToast } from "@/components/ui";
import { api } from "@/lib/api-client";
import { runCheckup } from "@/lib/engine";
import { money, shortDate } from "@/lib/format";
import { ANNUAL_PRICE_LABEL, isAnnual } from "@/lib/plan";
import type { EmploymentSettings, HouseholdProfile } from "@/lib/types";

// Household settings: profile, jobs, reminders, privacy & data, plan. No password and no email:
// this browser's cookie and the private link are the keys.

const MAX_JOBS = 4; // the API's limit per household (POST /api/employers → too_many_employers)

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
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-fg-primary">{children}</dd>
    </div>
  );
}

function Block({ id, icon, title, subtitle, action, children }: { id: string; icon: ReactNode; title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <Card>
        <CardHeader icon={icon} title={title} subtitle={subtitle} action={action} />
        <div className="mt-4">{children}</div>
      </Card>
    </section>
  );
}

const NAV: Array<[string, string]> = [
  ["profile", "Profile"],
  ["employers", "Employers"],
  ["notifications", "Notifications"],
  ["privacy", "Privacy & data"],
  ["plan", "Plan & billing"],
];

export function SettingsView() {
  const router = useRouter();
  const toast = useToast();
  const { state, data, refresh, clear } = useHousehold();
  const [editing, setEditing] = useState<"profile" | "new-job" | string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const result = useMemo(() => (data ? runCheckup(data) : null), [data]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  if (state.status === "loading") return <PageSkeleton label="Loading your settings…" />;
  if (state.status === "error")
    return (
      <Alert tone="danger" title="Couldn't load your settings" action={<Button variant="secondary" onClick={() => refresh().catch(() => undefined)}>Retry</Button>}>
        {state.error}
      </Alert>
    );
  if (!data)
    return (
      <div>
        <PageHeader title="Settings" />
        <Card className="mt-6">
          <EmptyState
            icon={<HouseIcon />}
            title="No household in this browser yet"
            description="Your household is created when you check your first pay stub. Already have one? Open your private link on this device."
            actions={
              <ButtonLink href="/upload" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />}>
                Check a pay stub
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );

  const p = data.profile;
  const annual = isAnnual(data) && data.plan !== undefined;
  const extras = (Object.keys(EXTRAS) as Array<keyof HouseholdProfile["flags"]>).filter((k) => p.flags[k]).map((k) => EXTRAS[k]);
  const job = data.employers.find((e) => e.id === editing) ?? null;
  const notMarried = p.filingStatus === "single" || p.filingStatus === "head_of_household";
  const saved = (title: string) => toast({ title });

  const removeAll = async () => {
    setDeleting(true);
    try {
      await api.deleteHousehold();
      clear();
      toast({ title: "Your data was deleted" });
      router.push("/");
    } catch (e) {
      toast({ tone: "danger", title: "Couldn't delete your data", description: e instanceof Error ? e.message : undefined });
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your household, jobs and data." />
      <nav aria-label="Settings sections" className="no-print mt-4 flex gap-2 overflow-x-auto pb-1">
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-fg-secondary hover:bg-slate-50">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-6 grid gap-4">
        <Block
          id="profile"
          icon={<HouseIcon className="h-5 w-5" />}
          title="Profile"
          subtitle="Filing status, state and dependents. Changes update your projection and the forms to expect in January."
          action={editing !== "profile" && <Button variant="secondary" size="sm" onClick={() => setEditing("profile")}>Edit</Button>}
        >
          {editing === "profile" ? (
            <ProfileForm
              initial={p}
              submitLabel="Save profile"
              onCancel={() => setEditing(null)}
              onSubmit={async (profile) => {
                await api.saveProfile(profile);
                await refresh();
                setEditing(null);
                saved("Profile saved");
              }}
            />
          ) : (
            <dl className="divide-y divide-border">
              <Row label="Filing status">{FILING_LABEL[p.filingStatus]}</Row>
              <Row label="State">{p.state}</Row>
              <Row label="Children under 17">{p.dependentsUnder17}</Row>
              <Row label="Other dependents">{p.otherDependents}</Row>
              <Row label="Also has">{extras.join(", ") || "None"}</Row>
            </dl>
          )}
        </Block>

        <Block
          id="employers"
          icon={<BriefcaseIcon className="h-5 w-5" />}
          title="Employers"
          subtitle={`Pay, 401(k) match and W-4 for each job. Up to ${MAX_JOBS} jobs per household.`}
          action={
            editing === null &&
            data.employers.length < MAX_JOBS && (
              <Button variant="secondary" size="sm" icon={<PlusIcon aria-hidden="true" className="h-4 w-4" />} onClick={() => setEditing("new-job")}>
                Add a job
              </Button>
            )
          }
        >
          {editing === "new-job" ? (
            <EmployerForm
              initial={newEmployerSettings(data.employers.some((e) => e.member === "self") ? "spouse" : "self")}
              notMarried={notMarried}
              submitLabel="Add job"
              onCancel={() => setEditing(null)}
              onSubmit={async (settings) => {
                await api.addEmployer(settings);
                await refresh();
                setEditing(null);
                saved("Job added");
              }}
            />
          ) : job ? (
            <EmployerForm
              key={job.id}
              initial={withoutId(job)}
              notMarried={notMarried}
              submitLabel="Save job"
              onCancel={() => setEditing(null)}
              onSubmit={async (settings) => {
                await api.updateEmployer(job.id, settings);
                await refresh();
                setEditing(null);
                saved("Job saved");
              }}
            />
          ) : data.employers.length === 0 ? (
            <p className="text-sm text-fg-secondary">No jobs yet. Add one to check its pay stubs.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.employers.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-fg-primary">{e.employerName}</p>
                    <p className="text-sm text-fg-secondary">
                      {e.member === "self" ? "You" : "Spouse"} ·{" "}
                      {e.payType === "salary" ? `${money(e.annualSalary ?? null, true)} a year` : `${money(e.hourlyRate ?? null)} an hour`}
                      {e.match401k ? ` · 401(k) match ${e.match401k.matchPercent}% up to ${e.match401k.upToPercentOfPay}%` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(e.id)} aria-label={`Edit job: ${e.employerName}`} disabled={editing !== null}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block id="notifications" icon={<BellIcon className="h-5 w-5" />} title="Notifications" subtitle="Calendar reminders, built in your browser. PayTrail doesn't send email.">
          {annual && result ? (
            <RemindersCard data={data} checklist={result.checklist} asOf={today} />
          ) : (
            <p className="text-sm text-fg-secondary">
              Calendar reminders for paydays and tax-form due dates are part of Annual. See <a href="#plan" className="font-medium text-brand-700 hover:underline">Plan &amp; billing</a>.
            </p>
          )}
        </Block>

        <Block id="privacy" icon={<ShieldCheckIcon className="h-5 w-5" />} title="Privacy & data" subtitle="There's no password: your private link is the key to your household.">
          <SaveLinkCard annual={annual} />
          <h3 className="mt-6 text-sm font-semibold text-fg-primary">Saved documents</h3>
          <p className="mb-2 text-[13px] text-fg-muted">Confirmed fields only, encrypted. Original files are never stored.</p>
          <DocumentsList documents={data.documents} employers={data.employers} onDeleted={refresh} />
          <div className="mt-6 rounded-control border border-danger-border p-4">
            <h3 className="text-sm font-semibold text-fg-primary">Delete my data</h3>
            <div className="mt-2">
              <DeletionScope />
            </div>
            <Button variant="danger" className="mt-4" icon={<Trash2Icon aria-hidden="true" className="h-4 w-4" />} onClick={() => setDeleteOpen(true)}>
              Delete my data
            </Button>
          </div>
        </Block>

        <Block id="plan" icon={<CreditCardIcon className="h-5 w-5" />} title="Plan & billing">
          {annual ? (
            <div className="flex items-start gap-3">
              <CircleCheckIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="font-medium text-fg-primary">
                  Annual · {ANNUAL_PRICE_LABEL}
                  {data.plan?.until ? `, active until ${shortDate(data.plan.until)}` : ""}
                </p>
                <p className="mt-1 text-sm text-fg-secondary">Every pay stub for both of you, the exact W-4 fix for each job, tax season and calendar reminders.</p>
              </div>
            </div>
          ) : (
            <Paywall title="You're on the free plan" reason="It checks one pay stub and shows your April projection. Annual checks every paycheck for both of you, all year." />
          )}
        </Block>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => (deleting ? undefined : setDeleteOpen(false))}
        title="Delete my data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Keep my data
            </Button>
            <Button variant="danger" loading={deleting} onClick={removeAll}>
              {deleting ? "Deleting…" : "Delete my data"}
            </Button>
          </>
        }
      >
        <DeletionScope />
      </Modal>
    </div>
  );
}
