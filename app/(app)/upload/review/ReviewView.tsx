"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeftIcon, ChevronRightIcon, FileSearchIcon, UploadIcon } from "lucide-react";
import { useHousehold } from "@/components/app/HouseholdProvider";
import { DocumentPreview } from "@/components/check/DocumentPreview";
import { PaystubEditor, W2Editor } from "@/components/DocumentEditor";
import { Paywall } from "@/components/Paywall";
import { RecoveryLinkCard } from "@/components/upload/RecoveryLinkCard";
import { useUploadQueue, type QueueItem } from "@/components/upload/UploadQueue";
import { Alert, Button, ButtonLink, Card, EmptyState, Field, PageHeader, PageSkeleton, Select, Stepper, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { formError } from "@/lib/formSchemas";
import { keepPendingDocument, type PendingDocument } from "@/lib/pendingDocument";
import { PaystubSchema, W2Schema } from "@/lib/validation";
import type { EmploymentSettings, Paystub, W2 } from "@/lib/types";

const PaystubForm = z.object({ employerId: z.string(), fields: PaystubSchema });
const W2Form = z.object({ employerId: z.string(), fields: W2Schema });

export function ReviewView() {
  const router = useRouter();
  const toast = useToast();
  const { state, data, refresh } = useHousehold();
  const queue = useUploadQueue();
  const ready = queue.items.filter((i) => i.status === "ready" && i.result);
  const [index, setIndex] = useState(0);
  const at = Math.min(index, Math.max(0, ready.length - 1));
  const item = ready[at];

  if (state.status === "loading") return <PageSkeleton label="Loading…" cards={0} />;

  if (!item || !data)
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Review your document" />
        <div className="mt-6">
          <Stepper steps={["Upload", "Review", "Get results"]} current={1} label="Checkup steps" />
        </div>
        <Card className="mt-8">
          <EmptyState
            icon={<FileSearchIcon />}
            title="Nothing to review"
            description="Files stay only in this tab's memory and are never stored, so they're gone after a reload or once saved. Upload the document again to review it."
            actions={
              <ButtonLink href="/upload" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />}>
                Upload a document
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );

  const afterSave = async (savedId: string) => {
    queue.markSaved(savedId);
    await refresh().catch(() => undefined);
    const left = ready.filter((i) => i.id !== savedId);
    if (left.length > 0) {
      setIndex(Math.min(at, left.length - 1));
      return;
    }
    queue.clear();
    router.push("/report");
  };

  return (
    <div>
      <PageHeader
        title="Review your document"
        subtitle="Compare each number with your document and fix anything that looks off. Nothing is saved until you confirm."
      />
      <div className="mx-auto mt-6 max-w-3xl">
        <Stepper steps={["Upload", "Review", "Get results"]} current={1} label="Checkup steps" />
      </div>

      {queue.recoveryUrl && (
        <div className="mt-6">
          <RecoveryLinkCard url={queue.recoveryUrl} onDone={() => queue.setRecoveryUrl(null)} doneLabel="I saved it" />
        </div>
      )}

      {ready.length > 1 && (
        <nav aria-label="Documents to review" className="mt-6 flex items-center justify-center gap-3">
          <Button size="sm" variant="secondary" aria-label="Previous document" disabled={at === 0} onClick={() => setIndex(at - 1)} icon={<ChevronLeftIcon aria-hidden="true" className="h-4 w-4" />} />
          <p className="text-sm font-medium tabular-nums text-fg-primary" aria-live="polite">
            {at + 1} of {ready.length}
          </p>
          <Button
            size="sm"
            variant="secondary"
            aria-label="Next document"
            disabled={at === ready.length - 1}
            onClick={() => setIndex(at + 1)}
            icon={<ChevronRightIcon aria-hidden="true" className="h-4 w-4" />}
          />
        </nav>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        <div className="h-[55vh] min-h-[320px] lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
          <DocumentPreview file={item.file} />
        </div>
        <ReviewForm key={item.id} item={item} employers={data.employers} onSaved={() => afterSave(item.id)} onSkip={() => queue.remove(item.id)} toast={toast} />
      </div>
    </div>
  );
}

function guessEmployer(item: QueueItem, employers: EmploymentSettings[]): string {
  const name = (item.result?.fields.employerName ?? "").toLowerCase();
  const guess = employers.find((e) => name && (name.includes(e.employerName.toLowerCase()) || e.employerName.toLowerCase().includes(name)));
  return guess?.id ?? employers[0]?.id ?? "";
}

function ReviewForm({
  item,
  employers,
  onSaved,
  onSkip,
  toast,
}: {
  item: QueueItem;
  employers: EmploymentSettings[];
  onSaved: () => Promise<void>;
  onSkip: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const result = item.result!;
  const isStub = result.documentType === "paystub";
  const resolver = useMemo(
    () => zodResolver(isStub ? PaystubForm : W2Form, { error: formError }) as unknown as Resolver<FieldValues>,
    [isStub],
  );
  const form = useForm<FieldValues>({ resolver, defaultValues: { employerId: guessEmployer(item, employers), fields: result.fields } });
  const [problem, setProblem] = useState<{ code: string; message: string } | null>(null);
  const flagged = Object.values(result.confidence).filter((c) => c !== "high").length;

  const save = form.handleSubmit(async (values) => {
    setProblem(null);
    const employerId = (values.employerId as string) || null;
    const doc: PendingDocument = isStub
      ? { docType: "paystub", employerId, taxYear: Number((values.fields as Paystub).payDate.slice(0, 4)), fields: values.fields as Paystub }
      : { docType: "w2", employerId, taxYear: (values.fields as W2).taxYear, fields: values.fields as W2 };
    try {
      await api.addDocument(doc);
      toast({ title: `${isStub ? "Pay stub" : "W-2"} saved`, description: "Stored encrypted. The file itself was not kept." });
      await onSaved();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "network";
      // Over the free plan: keep the confirmed fields for this tab, so they're saved after checkout.
      if (code === "payment_required") keepPendingDocument(doc);
      else toast({ tone: "danger", title: "Couldn't save", description: e instanceof Error ? e.message : undefined });
      setProblem({ code, message: e instanceof Error ? e.message : "Something went wrong." });
    }
  });

  return (
    <Card>
      <form onSubmit={save} noValidate>
        <h2 className="text-lg font-semibold text-fg-primary">Confirm your {isStub ? "pay stub" : "W-2"}</h2>
        <p className="mt-0.5 text-[13px] text-fg-muted">{item.file.name}</p>

        {flagged > 0 && (
          <Alert tone="warning" className="mt-4" title={`${flagged} field${flagged === 1 ? " was" : "s were"} hard to read`}>
            They&apos;re highlighted and marked &quot;Please verify&quot;. Check each one against your document.
          </Alert>
        )}
        {result.warnings.length > 0 && (
          <Alert tone="danger" className="mt-3" title="Please check before saving">
            <ul className="list-disc pl-5">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Field label="Which job is this?" htmlFor="review-employer" className="mt-5">
          <Select id="review-employer" {...form.register("employerId")}>
            {employers.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employerName} ({e.member === "self" ? "you" : "spouse"})
              </option>
            ))}
            <option value="">Not listed</option>
          </Select>
        </Field>

        <div className="mt-5">{isStub ? <PaystubEditor form={form} confidence={result.confidence} /> : <W2Editor form={form} confidence={result.confidence} />}</div>

        {Object.keys(form.formState.errors).length > 0 && (
          <Alert tone="danger" className="mt-5">
            Some fields need a fix — they&apos;re marked above.
          </Alert>
        )}

        {problem?.code === "payment_required" ? (
          <div className="mt-5">
            <Paywall
              title="Add more documents with Annual"
              reason={`${problem.message} The fields you just confirmed are kept in this tab and saved as soon as Annual is active.`}
            />
          </div>
        ) : problem?.code === "duplicate_document" ? (
          <Alert
            tone="warning"
            className="mt-5"
            title="This document is already saved"
            action={
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/report" size="sm">
                  Open my report
                </ButtonLink>
                <Button size="sm" variant="secondary" onClick={onSkip}>
                  Skip this file
                </Button>
              </div>
            }
          >
            We already have a {isStub ? "pay stub from this job with the same pay date" : "W-2 from this job for this year"}. Saving it again would count it
            twice.
          </Alert>
        ) : (
          problem && (
            <Alert tone="danger" className="mt-5">
              {problem.message}
            </Alert>
          )
        )}

        <div className="no-print mt-6 flex flex-col gap-3 sm:flex-row">
          {problem?.code !== "payment_required" && problem?.code !== "duplicate_document" && (
            <Button type="submit" loading={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Confirm data"}
            </Button>
          )}
          <Button variant="secondary" onClick={onSkip} disabled={form.formState.isSubmitting}>
            Discard this file
          </Button>
          {problem?.code === "payment_required" && (
            <Link href="/report" className="self-center text-sm font-medium text-brand-700 hover:underline">
              Back to my report
            </Link>
          )}
        </div>
      </form>
    </Card>
  );
}
