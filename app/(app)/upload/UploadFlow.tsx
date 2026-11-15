"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, BriefcaseIcon, FileIcon, FlaskConicalIcon, RotateCwIcon, XIcon } from "lucide-react";
import { useHousehold } from "@/components/app/HouseholdProvider";
import { CheckIntro } from "@/components/check/CheckIntro";
import { EmployerWizard } from "@/components/check/EmployerWizard";
import { ProfileWizard } from "@/components/check/ProfileWizard";
import { Paywall } from "@/components/Paywall";
import { RecoveryLinkCard, visibleRecoveryUrl } from "@/components/upload/RecoveryLinkCard";
import { useUploadQueue, type QueueItem } from "@/components/upload/UploadQueue";
import { Alert, Badge, Button, Card, FileUploader, PageHeader, PageSkeleton, ProgressBar, Stepper, useToast } from "@/components/ui";
import { api } from "@/lib/api-client";
import { isAnnual, FREE_LIMITS } from "@/lib/plan";
import { isSampleEmployer, SAMPLE_EMPLOYER, SAMPLE_PAYSTUB_URL, SAMPLE_PROFILE } from "@/lib/sample";
import { IMAGE_MAX_BYTES, PDF_MAX_BYTES, PDF_MAX_PAGES } from "@/lib/upload";
import type { HouseholdData } from "@/lib/types";

type Setup = "intro" | "profile" | "recovery" | "employer" | null;

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

/** True when a free household has used its one pay stub (sample stubs don't count). */
function freeStubUsed(data: HouseholdData | null): boolean {
  if (!data || isAnnual(data)) return false;
  const sampleIds = new Set(data.employers.filter(isSampleEmployer).map((e) => e.id));
  const used = data.documents.filter((d) => d.docType === "paystub" && !(d.employerId && sampleIds.has(d.employerId))).length;
  return used >= FREE_LIMITS.paystubs;
}

export function UploadFlow() {
  const router = useRouter();
  const toast = useToast();
  const { state, data, refresh } = useHousehold();
  const queue = useUploadQueue();
  const [setup, setSetup] = useState<Setup | "auto">("auto");
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  // Before any upload: a household and at least one job. New visitors start with the intro.
  const step: Setup =
    setup !== "auto" ? setup : state.status === "none" ? "intro" : state.status === "ready" && data!.employers.length === 0 ? "employer" : null;

  // When every file has been read and nothing failed, go straight to the review.
  const wasBusy = useRef(false);
  const busy = queue.items.some((i) => i.status === "queued" || i.status === "reading");
  const ready = queue.items.filter((i) => i.status === "ready");
  const failed = queue.items.filter((i) => i.status === "error");
  useEffect(() => {
    if (busy) wasBusy.current = true;
    else if (wasBusy.current) {
      wasBusy.current = false;
      if (ready.length > 0 && failed.length === 0) router.push("/upload/review");
    }
  }, [busy, ready.length, failed.length, router]);

  // One click for judges: sample household + matching job, then the fictional PDF through the real reader.
  const trySample = async () => {
    setSampleError(null);
    setSampleBusy(true);
    try {
      let household = data;
      if (!household) {
        const created = await api.createHousehold(SAMPLE_PROFILE);
        queue.setRecoveryUrl(visibleRecoveryUrl(created.recoveryUrl));
        household = await refresh();
      }
      if (!household?.employers.some(isSampleEmployer)) {
        await api.addEmployer(SAMPLE_EMPLOYER);
        await refresh();
      }
      const res = await fetch(SAMPLE_PAYSTUB_URL);
      if (!res.ok) throw new Error("Could not load the sample pay stub. Try again.");
      const file = new File([await res.blob()], "sample-paystub.pdf", { type: "application/pdf" });
      setSetup(null);
      queue.add([file], { sample: true });
    } catch (e) {
      setSampleError(e instanceof Error ? e.message : "Could not start the sample. Try again.");
    } finally {
      setSampleBusy(false);
    }
  };

  if (state.status === "loading") return <PageSkeleton label="Loading…" cards={0} />;
  if (state.status === "error")
    return (
      <Alert tone="danger" title="Couldn't load your data" action={<Button variant="secondary" onClick={() => refresh().catch(() => undefined)}>Retry</Button>}>
        {state.error}
      </Alert>
    );

  const sampleBanner = <SampleBanner busy={sampleBusy} error={sampleError} onTry={trySample} />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Check a pay stub" subtitle="Upload a pay stub or W-2. You confirm every number before anything is saved." />
      <div className="mt-6">
        <Stepper steps={["Upload", "Review", "Get results"]} current={0} label="Checkup steps" />
      </div>

      <div className="mt-8 space-y-4">
        {step === "intro" && (
          <>
            <CheckIntro onStart={() => setSetup("profile")} />
            {sampleBanner}
          </>
        )}

        {step === "profile" && (
          <ProfileWizard
            onDone={async (profile) => {
              const res = await api.createHousehold(profile);
              setRecoveryUrl(visibleRecoveryUrl(res.recoveryUrl));
              await refresh();
              setSetup("recovery");
            }}
          />
        )}

        {step === "recovery" && recoveryUrl && <RecoveryLinkCard url={recoveryUrl} onDone={() => setSetup("employer")} />}

        {step === "employer" && (
          <EmployerWizard
            hasSelf={!!data?.employers.some((e) => e.member === "self")}
            notMarried={data?.profile.filingStatus === "single" || data?.profile.filingStatus === "head_of_household"}
            onDone={async (settings) => {
              await api.addEmployer(settings);
              await refresh();
              toast({ title: "Job saved", description: settings.employerName });
              setSetup(null);
            }}
            onSkip={data && data.employers.length > 0 ? () => setSetup(null) : undefined}
          />
        )}

        {step === null && data && (
          <>
            {queue.recoveryUrl && <RecoveryLinkCard url={queue.recoveryUrl} onDone={() => queue.setRecoveryUrl(null)} doneLabel="I saved it" />}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-secondary">
              <BriefcaseIcon aria-hidden="true" className="h-4 w-4 text-fg-muted" />
              {data.employers.length} job{data.employers.length === 1 ? "" : "s"} on file: {data.employers.map((e) => e.employerName).join(", ")}
              <button type="button" onClick={() => setSetup("employer")} className="font-medium text-brand-700 hover:underline">
                Add a job
              </button>
            </p>

            {freeStubUsed(data) ? (
              <Paywall
                title="Add more documents with Annual"
                reason="The free plan includes one pay stub, and you've used it. Annual adds every pay stub for both earners and your W-2s. The sample pay stub stays free."
              />
            ) : (
              <FileUploader
                accept={ACCEPT}
                multiple={isAnnual(data)}
                disabled={busy && !isAnnual(data)}
                onFiles={(files) => queue.add(files)}
                title={isAnnual(data) ? "Upload your pay stubs and W-2s" : "Upload your pay stub"}
                hint={
                  <>
                    Drag &amp; drop {isAnnual(data) ? "files" : "a file"} here, or choose {isAnnual(data) ? "them" : "it"}.
                    <span className="mt-1 block text-[13px] text-fg-muted">
                      PDF up to {mb(PDF_MAX_BYTES)} and {PDF_MAX_PAGES} pages · JPG, PNG or WebP photo up to {mb(IMAGE_MAX_BYTES)}
                    </span>
                  </>
                }
                buttonLabel={isAnnual(data) ? "Choose files" : "Choose a file"}
                footer={
                  isAnnual(data)
                    ? "Each file is read separately, one after another."
                    : "Free plan: one pay stub. Annual checks every pay stub for both of you."
                }
              />
            )}

            <QueueList />
            {ready.length > 0 && !busy && (
              <div className="flex flex-col gap-3 rounded-card border border-brand-200 bg-primary-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-fg-primary">
                  {ready.length} document{ready.length === 1 ? " is" : "s are"} ready to review.
                </p>
                <Button onClick={() => router.push("/upload/review")} icon={<ArrowRightIcon aria-hidden="true" className="h-4 w-4" />} className="flex-row-reverse">
                  Review {ready.length === 1 ? "it" : "them"}
                </Button>
              </div>
            )}
            {sampleBanner}
            <p className="text-[13px] text-fg-muted">
              We never ask for or keep your Social Security number — you can cover it before uploading. Your document is read by Claude
              (Anthropic API); every number in your report is calculated by our own code.{" "}
              <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
                How we handle files
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const STATUS: Record<QueueItem["status"], { label: string; tone: "neutral" | "info" | "success" | "danger" }> = {
  queued: { label: "Queued", tone: "neutral" },
  reading: { label: "Reading…", tone: "info" },
  ready: { label: "Ready to review", tone: "success" },
  error: { label: "Couldn't read", tone: "danger" },
  saved: { label: "Saved", tone: "success" },
};

function QueueList() {
  const queue = useUploadQueue();
  const items = queue.items.filter((i) => i.status !== "saved");
  if (items.length === 0) return null;
  const done = items.filter((i) => i.status === "ready" || i.status === "error").length;
  return (
    <Card padding="none">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-medium text-fg-primary">Your documents</p>
          <p className="tabular-nums text-fg-muted">
            {done} of {items.length} read
          </p>
        </div>
        <ProgressBar className="mt-2" value={(done / items.length) * 100} label="Documents read" />
      </div>
      {queue.paused && (
        <div className="px-4 pt-3 sm:px-5">
          <Alert tone="warning" title="Reading paused">
            You&apos;ve reached the limit of 15 document reads in 10 minutes. Wait a few minutes, then press Retry.
          </Alert>
        </div>
      )}
      <ul className="divide-y divide-border" aria-live="polite">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3 sm:px-5">
            <div className="flex items-start gap-3">
              <FileIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-fg-primary">{item.file.name}</p>
                  {item.sample && (
                    <Badge tone="warning" icon={<FlaskConicalIcon aria-hidden="true" />}>
                      Sample
                    </Badge>
                  )}
                  <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
                </div>
                <p className="text-[13px] text-fg-muted">
                  {(item.file.size / 1024).toLocaleString("en-US", { maximumFractionDigits: 0 })} KB
                  {item.result ? ` · ${item.result.documentType === "w2" ? "W-2" : "Pay stub"}` : ""}
                </p>
                {item.status === "reading" && (
                  <div className="mt-2">
                    <ProgressBar value={null} label={`Reading ${item.file.name}`} />
                    <p className="mt-1 text-[13px] text-fg-muted">Usually 20–40 seconds. Keep this tab open; the file stays in memory and is not stored.</p>
                  </div>
                )}
                {item.status === "error" && <p className="mt-1 text-sm text-danger">{item.error}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                {item.status === "error" && item.retryable && (
                  <Button size="sm" variant="secondary" icon={<RotateCwIcon aria-hidden="true" className="h-3.5 w-3.5" />} onClick={() => queue.retry(item.id)}>
                    Retry
                  </Button>
                )}
                {item.status !== "reading" && (
                  <button
                    type="button"
                    onClick={() => queue.remove(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    className="rounded-control p-1.5 text-fg-muted hover:bg-slate-100 hover:text-fg-primary"
                  >
                    <XIcon aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SampleBanner({ busy, error, onTry }: { busy: boolean; error: string | null; onTry: () => void }) {
  return (
    <div className="rounded-card border border-brand-200 bg-surface p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="font-medium text-fg-primary">No pay stub at hand?</p>
        <p className="text-sm text-fg-secondary">
          Try a fictional sample: an hourly job in Texas. It goes through the same reader and checks as your own document, and one mistake is
          hidden in it.
        </p>
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      </div>
      <Button variant="secondary" loading={busy} className="mt-3 w-full sm:mt-0 sm:w-auto" onClick={onTry} icon={<FlaskConicalIcon aria-hidden="true" className="h-4 w-4" />}>
        Try with a sample
      </Button>
    </div>
  );
}
