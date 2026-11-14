"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, FRIENDLY } from "@/lib/api-client";
import { uploadProblem } from "@/lib/upload";
import { Button, ButtonLink, Card, Field, inputClass, Notice } from "@/components/ui";
import { PaystubEditor, W2Editor } from "@/components/DocumentEditor";
import { Paywall } from "@/components/Paywall";
import { ProfileForm } from "@/components/ProfileForm";
import { isSampleEmployer, SAMPLE_EMPLOYER, SAMPLE_PAYSTUB_URL, SAMPLE_PROFILE } from "@/lib/sample";
import { FREE_LIMITS } from "@/lib/plan";
import type { EmploymentSettings, ExtractResult, HouseholdData, HouseholdProfile, Paystub, W2 } from "@/lib/types";

type Step = "loading" | "profile" | "recovery" | "employer" | "upload" | "confirm" | "done";
type Extracted = Exclude<ExtractResult, { documentType: "other" }>;

const STEPS: Array<[Step, string]> = [
  ["profile", "Household"],
  ["employer", "Employer"],
  ["upload", "Upload"],
  ["confirm", "Confirm"],
];

export function CheckFlow() {
  const [step, setStep] = useState<Step>("loading");
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);
  // Set when "Try with a sample" created the household, so the link is still shown once.
  const [sampleRecoveryUrl, setSampleRecoveryUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getHousehold();
      setHousehold(data);
      return data;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setHousehold(null);
        return null;
      }
      throw e;
    }
  }, []);

  useEffect(() => {
    refresh()
      .then((data) => setStep(!data ? "profile" : data.employers.length === 0 ? "employer" : "upload"))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Could not load your data.");
        setStep("profile");
      });
  }, [refresh]);

  const [sampleBusy, setSampleBusy] = useState(false);

  // One click for judges: sample household + matching job, then the fictional PDF through the real reader.
  const trySample = async () => {
    setError(null);
    setSampleBusy(true);
    try {
      let data = household;
      if (!data) {
        const created = await api.createHousehold(SAMPLE_PROFILE);
        setSampleRecoveryUrl(visibleRecoveryUrl(created.recoveryUrl));
        data = await refresh();
      }
      if (!data?.employers.some((e) => e.employerName === SAMPLE_EMPLOYER.employerName)) {
        await api.addEmployer(SAMPLE_EMPLOYER);
        data = await refresh();
      }
      const res = await fetch(SAMPLE_PAYSTUB_URL);
      if (!res.ok) throw new Error("Could not load the sample pay stub. Try again.");
      const file = new File([await res.blob()], "sample-paystub.pdf", { type: "application/pdf" });
      const extractedSample = await api.extract(file);
      if (extractedSample.documentType === "other") throw new Error("The sample could not be read. Try again in a minute.");
      setExtracted(extractedSample);
      setStep("confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run the sample. Try again.");
    } finally {
      setSampleBusy(false);
    }
  };

  const stepIndex = STEPS.findIndex(([s]) => s === (step === "recovery" ? "profile" : step === "done" ? "confirm" : step));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Check my pay stub</h1>
      <p className="mt-1 text-slate-600">About 3 minutes. No account needed — your data is tied to this browser.</p>

      {step !== "loading" && (
        <ol className="mt-6 flex gap-2 text-xs sm:text-sm">
          {STEPS.map(([s, name], i) => (
            <li
              key={s}
              className={`flex-1 rounded-md px-2 py-1.5 text-center font-medium ${
                i < stepIndex ? "bg-brand-100 text-brand-800" : i === stepIndex ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {i + 1}. {name}
            </li>
          ))}
        </ol>
      )}

      {error && (
        <div className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}

      {(step === "profile" || step === "employer" || step === "upload") && (
        <SampleBanner busy={sampleBusy} onTry={trySample} />
      )}

      <div className="mt-6">
        {step === "loading" && <p className="text-slate-500">Loading…</p>}

        {step === "profile" && (
          <ProfileStep
            onDone={async (profile) => {
              setError(null);
              const res = await api.createHousehold(profile);
              setRecoveryUrl(visibleRecoveryUrl(res.recoveryUrl));
              await refresh();
              setStep("recovery");
            }}
          />
        )}

        {step === "recovery" && recoveryUrl && <RecoveryStep url={recoveryUrl} onDone={() => setStep("employer")} />}

        {step === "employer" && (
          <EmployerStep
            hasSelf={!!household?.employers.some((e) => e.member === "self")}
            notMarried={
              household?.profile.filingStatus === "single" || household?.profile.filingStatus === "head_of_household"
            }
            onDone={async (settings) => {
              setError(null);
              await api.addEmployer(settings);
              await refresh();
              setStep("upload");
            }}
            onSkip={household && household.employers.length > 0 ? () => setStep("upload") : undefined}
          />
        )}

        {step === "upload" && (
          <UploadStep
            freeStubUsed={freeStubUsed(household)}
            employers={household?.employers ?? []}
            onAddEmployer={() => setStep("employer")}
            onExtracted={(res) => {
              setError(null);
              setExtracted(res);
              setStep("confirm");
            }}
          />
        )}

        {step === "confirm" && extracted && household && (
          <ConfirmStep
            extracted={extracted}
            employers={household.employers}
            onBack={() => setStep("upload")}
            onSaved={async () => {
              await refresh();
              setExtracted(null);
              setStep("done");
            }}
          />
        )}

        {step === "done" && (
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Saved — your report is ready.</h2>
            <p className="mt-1 text-sm text-slate-600">
              Your confirmed fields are stored encrypted. The original file was not kept.
            </p>
            {household && household.profile.filingStatus === "married_joint" && household.employers.length < 2 && (
              <p className="mt-2 text-sm text-slate-600">
                Both of you work? Add your spouse&apos;s job and a pay stub to see the household&apos;s April forecast.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/report">See my report</ButtonLink>
              <Button variant="secondary" onClick={() => setStep("upload")}>
                Upload another document
              </Button>
            </div>
          </Card>
        )}

        {step === "done" && sampleRecoveryUrl && (
          <div className="mt-4">
            <RecoveryStep url={sampleRecoveryUrl} />
          </div>
        )}
      </div>
    </div>
  );
}

function SampleBanner({ busy, onTry }: { busy: boolean; onTry: () => void }) {
  const elapsed = useElapsed(busy);
  return (
    <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {busy ? (
          <div role="status" aria-live="polite" className="flex items-center gap-3">
            <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            <p className="text-sm font-medium text-slate-800">
              Reading the sample pay stub… <span className="tabular-nums">{elapsed}s</span>
              <span className="block font-normal text-slate-600">Same reader and checks as your own document. Usually 10–40 seconds.</span>
            </p>
          </div>
        ) : (
          <>
            <p className="font-medium text-slate-900">No pay stub at hand?</p>
            <p className="text-sm text-slate-600">
              Try a fictional sample: an hourly job in Texas. It goes through the real reader, and one mistake is hidden in it.
            </p>
          </>
        )}
      </div>
      {!busy && (
        <Button type="button" variant="secondary" className="mt-3 w-full shrink-0 sm:mt-0 sm:w-auto" onClick={onTry}>
          Try with a sample pay stub
        </Button>
      )}
    </div>
  );
}

function useElapsed(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);
  return elapsed;
}

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errCode, setErrCode] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    setErrCode(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setErrCode(e instanceof ApiError ? e.code : null);
    } finally {
      setBusy(false);
    }
  };
  return { busy, err, errCode, run };
}

function ProfileStep({ onDone }: { onDone: (p: HouseholdProfile) => Promise<void> }) {
  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Your household</h2>
      <div className="mt-4">
        <ProfileForm submitLabel="Continue" onSubmit={onDone} />
      </div>
    </Card>
  );
}

// Use the origin the visitor actually sees; the server may sit behind a proxy.
function visibleRecoveryUrl(serverUrl: string): string {
  const link = new URL(serverUrl);
  return `${window.location.origin}${link.pathname}${link.hash}`;
}

/** True when a free household has used its one pay stub (sample stubs don't count). */
function freeStubUsed(data: HouseholdData | null): boolean {
  if (!data || data.plan?.tier !== "free") return false;
  const sampleIds = new Set(data.employers.filter(isSampleEmployer).map((e) => e.id));
  const used = data.documents.filter((d) => d.docType === "paystub" && !(d.employerId && sampleIds.has(d.employerId))).length;
  return used >= FREE_LIMITS.paystubs;
}

function RecoveryStep({ url, onDone }: { url: string; onDone?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Save your private link</h2>
      <Notice tone="warning">
        Save this link — it&apos;s the only way back to your data. We can&apos;t recover it.
      </Notice>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input readOnly aria-label="Private recovery link" className={`${inputClass} font-mono text-xs`} value={url} onFocus={(e) => e.target.select()} />
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Anyone with this link can open your data. Keep it like a password.</p>
      {onDone && (
        <Button type="button" className="mt-4" onClick={onDone}>
          I saved it — continue
        </Button>
      )}
    </Card>
  );
}

function EmployerStep({
  hasSelf,
  notMarried = false,
  onDone,
  onSkip,
}: {
  hasSelf: boolean;
  notMarried?: boolean;
  onDone: (s: Omit<EmploymentSettings, "id">) => Promise<void>;
  onSkip?: () => void;
}) {
  const [s, setS] = useState<Omit<EmploymentSettings, "id">>({
    member: hasSelf ? "spouse" : "self",
    employerName: "",
    payType: "salary",
    annualSalary: undefined,
    hourlyRate: undefined,
    overtimeEligible: false,
    match401k: { matchPercent: 50, upToPercentOfPay: 6 },
    w4: { step2Checked: false, step3Credits: 0, step4aOtherIncome: 0, step4bDeductions: 0, step4cExtraWithholding: 0 },
  });
  const [hasMatch, setHasMatch] = useState(true);
  const { busy, err, run } = useSubmit();
  const num = (v: string) => (v === "" ? 0 : Number(v) || 0);
  const w4 = (k: keyof EmploymentSettings["w4"], v: number | boolean) => setS({ ...s, w4: { ...s.w4, [k]: v } });

  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Employer</h2>
      <p className="text-sm text-slate-500">Add each job in the household. You can add your spouse&apos;s job next.</p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() =>
            onDone({
              ...s,
              annualSalary: s.payType === "salary" ? s.annualSalary : undefined,
              hourlyRate: s.payType === "hourly" ? s.hourlyRate : undefined,
              match401k: hasMatch ? s.match401k : undefined,
            }),
          );
        }}
      >
        <Field label="Whose job">
          <select className={inputClass} value={s.member} onChange={(e) => setS({ ...s, member: e.target.value as "self" | "spouse" })}>
            <option value="self">Mine</option>
            <option value="spouse">My spouse&apos;s</option>
          </select>
        </Field>
        {s.member === "spouse" && notMarried && (
          <div className="sm:col-span-2">
            <Notice tone="warning">
              Your household is set to file as single or head of household, so the forecast won&apos;t count a spouse&apos;s
              income the way a joint return does. If you&apos;re married, change the filing status on your{" "}
              <Link href="/report" className="font-medium underline">
                report
              </Link>{" "}
              (Edit profile). If this is your own second job, choose &quot;Mine&quot;.
            </Notice>
          </div>
        )}
        <Field label="Employer name">
          <input required maxLength={200} className={inputClass} value={s.employerName} onChange={(e) => setS({ ...s, employerName: e.target.value })} />
        </Field>
        <Field label="Pay type">
          <select className={inputClass} value={s.payType} onChange={(e) => setS({ ...s, payType: e.target.value as "salary" | "hourly" })}>
            <option value="salary">Salary</option>
            <option value="hourly">Hourly</option>
          </select>
        </Field>
        {s.payType === "salary" ? (
          <Field label="Annual salary (USD)">
            <input
              required
              type="number"
              min={0}
              step="1"
              className={inputClass}
              value={s.annualSalary ?? ""}
              onChange={(e) => setS({ ...s, annualSalary: e.target.value === "" ? undefined : num(e.target.value) })}
            />
          </Field>
        ) : (
          <Field label="Hourly rate (USD)">
            <input
              required
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={s.hourlyRate ?? ""}
              onChange={(e) => setS({ ...s, hourlyRate: e.target.value === "" ? undefined : num(e.target.value) })}
            />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" checked={s.overtimeEligible} onChange={(e) => setS({ ...s, overtimeEligible: e.target.checked })} />
          Eligible for overtime pay (non-exempt)
        </label>

        <div className="rounded-lg border border-slate-200 p-4 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={hasMatch} onChange={(e) => setHasMatch(e.target.checked)} />
            Employer matches 401(k) contributions
          </label>
          {hasMatch && s.match401k && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Matches (%)" hint="e.g. 50 = 50 cents per dollar">
                <input
                  type="number"
                  min={0}
                  max={200}
                  className={inputClass}
                  value={s.match401k.matchPercent}
                  onChange={(e) => setS({ ...s, match401k: { ...s.match401k!, matchPercent: num(e.target.value) } })}
                />
              </Field>
              <Field label="Up to (% of pay)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputClass}
                  value={s.match401k.upToPercentOfPay}
                  onChange={(e) => setS({ ...s, match401k: { ...s.match401k!, upToPercentOfPay: num(e.target.value) } })}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-4 sm:col-span-2">
          <p className="text-sm font-medium text-slate-700">Current W-4 at this job</p>
          <p className="text-xs text-slate-500">
            From the W-4 you gave HR, or your payroll portal. Not sure? Leave the zeros — most people never fill these in.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={s.w4.step2Checked} onChange={(e) => w4("step2Checked", e.target.checked)} />
            Step 2 checkbox is checked (multiple jobs / spouse works)
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Step 3 credits ($/yr)">
              <input type="number" min={0} className={inputClass} value={s.w4.step3Credits} onChange={(e) => w4("step3Credits", num(e.target.value))} />
            </Field>
            <Field label="Step 4(a) other income ($/yr)">
              <input type="number" min={0} className={inputClass} value={s.w4.step4aOtherIncome} onChange={(e) => w4("step4aOtherIncome", num(e.target.value))} />
            </Field>
            <Field label="Step 4(b) deductions ($/yr)">
              <input type="number" min={0} className={inputClass} value={s.w4.step4bDeductions} onChange={(e) => w4("step4bDeductions", num(e.target.value))} />
            </Field>
            <Field label="Step 4(c) extra ($/paycheck)">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={s.w4.step4cExtraWithholding}
                onChange={(e) => w4("step4cExtraWithholding", num(e.target.value))}
              />
            </Field>
          </div>
        </div>

        {err && (
          <div className="sm:col-span-2">
            <Notice tone="danger">{err}</Notice>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save employer"}
          </Button>
          {onSkip && (
            <Button type="button" variant="secondary" onClick={onSkip}>
              Skip — go to upload
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

// Errors that retrying the same file won't fix.
const FILE_ERRORS = new Set(["bad_type", "bad_size", "image_too_large", "too_many_pages", "unreadable", "refused", "truncated"]);

function UploadStep({
  freeStubUsed,
  employers,
  onAddEmployer,
  onExtracted,
}: {
  freeStubUsed: boolean;
  employers: EmploymentSettings[];
  onAddEmployer: () => void;
  onExtracted: (res: Extracted) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [notDoc, setNotDoc] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const { busy, err, errCode, run } = useSubmit();
  const elapsed = useElapsed(busy);

  const handle = (file: File | undefined) => {
    if (!file) return;
    setNotDoc(null);
    setFileErr(null);
    // Wrong type or size is caught here, so the file is never sent just to be rejected.
    const problem = uploadProblem(file);
    if (problem) {
      setFileErr(FRIENDLY[problem]);
      return;
    }
    run(async () => {
      const res = await api.extract(file);
      if (res.documentType === "other") setNotDoc(res.warnings[0] ?? "This does not look like a pay stub or a W-2.");
      else onExtracted(res);
    });
  };

  // Checked before reading the file, so a stub that could not be saved never costs a read.
  if (freeStubUsed) {
    return (
      <Paywall
        title="Add more documents with Annual"
        reason="The free plan includes one pay stub, and you've used it. Annual adds every pay stub for both earners and your W-2s. The sample pay stub stays free."
      />
    );
  }

  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Upload a pay stub or W-2</h2>
      <p className="text-sm text-slate-500">
        {employers.length} job{employers.length === 1 ? "" : "s"} on file:{" "}
        {employers.map((e) => e.employerName).join(", ") || "none"} ·{" "}
        <button type="button" className="font-medium text-brand-700 hover:underline" onClick={onAddEmployer}>
          add a job
        </button>
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files[0]);
        }}
        className={`mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center ${
          dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50"
        }`}
      >
        {busy ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="mt-3 font-medium text-slate-800">Reading your document… {elapsed > 0 && <span className="tabular-nums">{elapsed}s</span>}</p>
            <p className="text-sm text-slate-500">
              {elapsed < 45 ? "Usually 20–40 seconds. Keep this tab open." : "Taking longer than usual — still working."}
            </p>
            <p className="mt-1 text-xs text-slate-500">The file is processed in memory and not stored.</p>
          </div>
        ) : (
          <>
            <p className="font-medium text-slate-800">Drop a PDF or photo here</p>
            <p className="text-sm text-slate-500">PDF up to 10 MB, or a JPG, PNG or WebP photo up to 7 MB</p>
            <p className="mt-1 text-xs text-slate-500">Tip: you can cover your SSN before uploading. We don&apos;t need it.</p>
            <Button type="button" className="mt-4" onClick={() => inputRef.current?.click()}>
              Choose file or take a photo
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handle(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {(fileErr || err || notDoc) && (
        <div className="mt-4">
          <Notice tone="danger">
            <p className="font-medium">{fileErr ?? err ?? notDoc}</p>
            <p className="mt-1">
              {notDoc
                ? "Upload a pay stub (earnings statement) or a W-2 form."
                : fileErr || (errCode && FILE_ERRORS.has(errCode))
                  ? "Choose a different file: the original PDF or a sharper, smaller photo."
                  : "Try again in a minute. If it keeps failing, upload the original PDF or a sharper photo."}{" "}
              Meanwhile you can{" "}
              <Link href="/demo/couple" className="font-medium underline">
                see a sample report
              </Link>
              .
            </p>
          </Notice>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        We never ask for or keep your Social Security number. Your document is read by Claude (Anthropic API); every number in your
        report is calculated by our own code.
      </p>
    </Card>
  );
}

function ConfirmStep({
  extracted,
  employers,
  onBack,
  onSaved,
}: {
  extracted: Extracted;
  employers: EmploymentSettings[];
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const [paystub, setPaystub] = useState<Paystub | null>(extracted.documentType === "paystub" ? extracted.fields : null);
  const [w2, setW2] = useState<W2 | null>(extracted.documentType === "w2" ? extracted.fields : null);
  const name = (paystub?.employerName ?? w2?.employerName ?? "").toLowerCase();
  const guess = employers.find((e) => name && (name.includes(e.employerName.toLowerCase()) || e.employerName.toLowerCase().includes(name)));
  const [employerId, setEmployerId] = useState<string>(guess?.id ?? employers[0]?.id ?? "");
  const { busy, err, errCode, run } = useSubmit();
  const flagged = Object.keys(extracted.confidence).length;

  return (
    <Card>
      <h2 className="font-semibold text-slate-900">
        Confirm your {extracted.documentType === "paystub" ? "pay stub" : "W-2"}
      </h2>
      <p className="text-sm text-slate-500">Check the numbers against your document. Fix anything that looks off.</p>
      {flagged > 0 && (
        <div className="mt-3">
          <Notice tone="warning">
            {flagged} field{flagged === 1 ? " was" : "s were"} hard to read — highlighted in{" "}
            <span className="font-semibold text-amber-700">amber</span> (please check) or{" "}
            <span className="font-semibold text-rose-700">red</span> (likely wrong).
          </Notice>
        </div>
      )}
      {extracted.warnings.length > 0 && (
        <div className="mt-3">
          <Notice tone="danger">
            <p className="font-medium">Please check before saving:</p>
            <ul className="mt-1 list-disc pl-5">
              {extracted.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}

      <div className="mt-4">
        <Field label="Which job is this?">
          <select className={inputClass} value={employerId} onChange={(e) => setEmployerId(e.target.value)}>
            {employers.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employerName} ({e.member === "self" ? "you" : "spouse"})
              </option>
            ))}
            <option value="">Not listed</option>
          </select>
        </Field>
      </div>

      <div className="mt-5">
        {paystub && <PaystubEditor value={paystub} onChange={setPaystub} confidence={extracted.confidence} />}
        {w2 && <W2Editor value={w2} onChange={setW2} confidence={extracted.confidence} />}
      </div>

      {err && errCode === "payment_required" ? (
        <div className="mt-4">
          <Paywall title="Add more documents with Annual" reason={err} />
        </div>
      ) : (
        err && (
          <div className="mt-4">
            <Notice tone="danger">{err}</Notice>
          </div>
        )
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {errCode !== "payment_required" && (
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const id = employerId || null;
              if (paystub) {
                const year = Number(paystub.payDate.slice(0, 4)) || new Date().getFullYear();
                await api.addDocument({ docType: "paystub", employerId: id, taxYear: year, fields: paystub });
              } else if (w2) {
                await api.addDocument({ docType: "w2", employerId: id, taxYear: w2.taxYear, fields: w2 });
              }
              await onSaved();
            })
          }
        >
          {busy ? "Saving…" : "Looks right — save"}
        </Button>
        )}
        {errCode === "payment_required" ? (
          <ButtonLink href="/report" variant="secondary">
            Back to my report
          </ButtonLink>
        ) : (
          <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>
            Upload a different file
          </Button>
        )}
      </div>
    </Card>
  );
}
