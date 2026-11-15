"use client";

import { useEffect, useRef, useState } from "react";
import { FileSearchIcon, FlaskConicalIcon, PrinterIcon, UploadIcon } from "lucide-react";
import { useHousehold } from "@/components/app/HouseholdProvider";
import { ReportBody } from "@/components/ReportBody";
import { SaveLinkCard } from "@/components/SaveLinkCard";
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, PageHeader, PageSkeleton, useToast } from "@/components/ui";
import { api, ApiError } from "@/lib/api-client";
import { localDate, shortDate } from "@/lib/format";
import { pendingDocumentLabel, takePendingDocument } from "@/lib/pendingDocument";
import { isAnnual } from "@/lib/plan";
import type { ChecklistItem, ChecklistStatus } from "@/lib/types";

export function ReportView() {
  const toast = useToast();
  const { state, data, refresh } = useHousehold();
  const [checkoutNotice, setCheckoutNotice] = useState<"upgraded" | "cancelled" | null>(null);
  const [pendingNotice, setPendingNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
    // Stripe returns here with ?upgraded=1 (after /billing/success) or ?checkout=cancelled.
    const q = new URLSearchParams(window.location.search);
    if (q.get("upgraded") === "1") setCheckoutNotice("upgraded");
    else if (q.get("checkout") === "cancelled") setCheckoutNotice("cancelled");
  }, []);

  // Back from Stripe on Annual: save the document that hit the free-plan limit before checkout.
  const pendingTried = useRef(false);
  const tier = data?.plan?.tier;
  useEffect(() => {
    if (pendingTried.current || checkoutNotice !== "upgraded" || tier !== "annual") return;
    pendingTried.current = true;
    const doc = takePendingDocument();
    if (!doc) return;
    const label = pendingDocumentLabel(doc);
    api
      .addDocument(doc)
      .then(() => refresh())
      .then(() => setPendingNotice({ tone: "success", text: `We saved the ${label} you confirmed before checkout. Your report below includes it.` }))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 409) setPendingNotice({ tone: "success", text: `Your ${label} was already saved.` });
        else
          setPendingNotice({
            tone: "warning",
            text: `We couldn't save the ${label} you confirmed before checkout (${e instanceof Error ? e.message : "unknown error"}). Upload it again.`,
          });
      });
  }, [checkoutNotice, tier, refresh]);

  if (state.status === "loading" || !today) return <PageSkeleton label="Loading your report…" />;
  if (state.status === "error")
    return (
      <Alert tone="danger" title="Couldn't load your report" action={<Button variant="secondary" onClick={() => refresh().catch(() => undefined)}>Retry</Button>}>
        {state.error}
      </Alert>
    );
  if (!data || data.documents.length === 0)
    return (
      <div>
        <PageHeader title="Paycheck Checkup Report" />
        <Card className="mt-6">
          <EmptyState
            icon={<FileSearchIcon />}
            title={data ? "No documents yet" : "No saved data in this browser"}
            description={
              data
                ? "Upload a pay stub to get your first checkup."
                : "Start a checkup, or open your private recovery link if you saved one."
            }
            actions={
              <>
                <ButtonLink href="/upload" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />}>
                  Upload a pay stub
                </ButtonLink>
                <ButtonLink href="/upload" variant="secondary" icon={<FlaskConicalIcon aria-hidden="true" className="h-4 w-4" />}>
                  Try with a sample
                </ButtonLink>
              </>
            }
          />
        </Card>
      </div>
    );

  const annual = data.plan?.tier === "annual";
  const saveStatus = async (item: ChecklistItem, status: ChecklistStatus) => {
    try {
      const existing = data.checklist.find((c) => c.formType === item.formType);
      if (existing) await api.setChecklistStatus(existing.id, status);
      else await api.saveChecklist([{ formType: item.formType, source: item.source, status, dueDate: item.dueDate }]);
      await refresh();
      toast({ title: `${item.formType} marked received` });
    } catch (e) {
      toast({ tone: "danger", title: "Couldn't save the checklist", description: e instanceof Error ? e.message : undefined });
    }
  };

  return (
    <div>
      <PageHeader
        title="Paycheck Checkup Report"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            Your household · {localDate(`${today}T12:00:00`)}
            <Badge tone={annual ? "success" : "neutral"}>{annual ? "Annual" : "Free plan"}</Badge>
          </span>
        }
        actions={
          <>
            <Button variant="secondary" icon={<PrinterIcon aria-hidden="true" className="h-4 w-4" />} onClick={() => window.print()}>
              Download PDF
            </Button>
            <ButtonLink href="/upload" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />}>
              Add a document
            </ButtonLink>
          </>
        }
      />
      <p className="print-only mt-2 text-sm">Estimates only. Not tax advice. Not affiliated with the IRS.</p>

      {checkoutNotice === "upgraded" && annual && (
        <div className="mt-4 space-y-3">
          <Alert tone="success" title={`Annual is active${data.plan?.until ? ` until ${shortDate(data.plan.until)}` : ""}.`}>
            Add every pay stub for both of you; the W-4 fix, tax season and reminders are now open.
          </Alert>
          {pendingNotice && <Alert tone={pendingNotice.tone}>{pendingNotice.text}</Alert>}
          <SaveLinkCard annual prominent />
        </div>
      )}
      {checkoutNotice === "cancelled" && (
        <Alert tone="neutral" className="mt-4">
          Checkout was cancelled. Nothing was charged.
        </Alert>
      )}

      <ReportBody
        data={data}
        asOf={today}
        locked={!isAnnual(data)}
        onChecklistStatus={saveStatus}
        packetTitle="Accountant packet"
        initialTab={Number(today.slice(5, 7)) <= 4 ? "tax_season" : "overview"}
      />
    </div>
  );
}
