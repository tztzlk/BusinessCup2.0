"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Badge, Button, Card, Modal, useToast } from "@/components/ui";
import { api } from "@/lib/api-client";
import { money, shortDate } from "@/lib/format";
import type { EmploymentSettings, Paystub, StoredDocument, W2 } from "@/lib/types";

// Saved documents (confirmed fields only) with "Delete" for one document at a time.
export function DocumentsList({
  documents,
  employers,
  onDeleted,
}: {
  documents: StoredDocument[];
  employers: EmploymentSettings[];
  onDeleted: () => Promise<unknown>;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState<StoredDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const employerName = (id: string | null) => employers.find((e) => e.id === id)?.employerName ?? "Unassigned";
  const kind = (d: StoredDocument) => (d.docType === "w2" ? "W-2" : "pay stub");

  if (documents.length === 0) return <p className="text-sm text-fg-muted">No documents yet.</p>;

  const remove = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      await api.deleteDocument(confirming.id);
      await onDeleted();
      toast({ title: `The ${kind(confirming)} was deleted`, description: "Your findings and projection were recalculated without it." });
      setConfirming(null);
    } catch (e) {
      toast({ tone: "danger", title: "Couldn't delete the document", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card padding="none">
        <ul className="divide-y divide-border">
          {documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={d.docType === "w2" ? "info" : "neutral"}>{d.docType === "w2" ? "W-2" : "Pay stub"}</Badge>
                  <span className="font-medium text-fg-primary">{employerName(d.employerId)}</span>
                </div>
                <p className="mt-1 text-fg-muted">
                  {d.docType === "paystub" ? `Paid ${shortDate((d.fields as Paystub).payDate)}` : `Tax year ${(d.fields as W2).taxYear}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="tabular-nums text-fg-primary">
                  {d.docType === "paystub" ? `${money((d.fields as Paystub).grossCurrent)} gross` : `${money((d.fields as W2).box1Wages)} box 1`}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:bg-danger-soft"
                  icon={<Trash2Icon aria-hidden="true" className="h-4 w-4" />}
                  aria-label={`Delete ${kind(d)} from ${employerName(d.employerId)}`}
                  onClick={() => setConfirming(d)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Modal
        open={confirming !== null}
        onClose={() => (busy ? undefined : setConfirming(null))}
        title={`Delete this ${confirming ? kind(confirming) : "document"}?`}
        description="Your findings and projection will be recalculated without it. This can't be undone."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)} disabled={busy}>
              Keep it
            </Button>
            <Button variant="danger" loading={busy} onClick={remove}>
              {busy ? "Deleting…" : "Yes, delete it"}
            </Button>
          </>
        }
      />
    </>
  );
}
