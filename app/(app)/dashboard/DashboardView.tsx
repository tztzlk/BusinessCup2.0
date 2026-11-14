"use client";

import { useMemo } from "react";
import { FileSearchIcon, UploadIcon } from "lucide-react";
import { useHousehold } from "@/components/app/HouseholdProvider";
import { Alert, Button, ButtonLink, Card, EmptyState, PageHeader, PageSkeleton } from "@/components/ui";
import { runCheckup } from "@/lib/engine";

export function DashboardView() {
  const { state, refresh } = useHousehold();
  const data = state.status === "ready" ? state.data : null;
  const result = useMemo(() => (data ? runCheckup(data) : null), [data]);

  if (state.status === "loading") return <PageSkeleton label="Loading your dashboard…" />;
  if (state.status === "error")
    return (
      <Alert tone="danger" title="Couldn't load your data" action={<Button variant="secondary" onClick={() => refresh().catch(() => undefined)}>Retry</Button>}>
        {state.error}
      </Alert>
    );

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your latest paycheck checkup." />
      <Card className="mt-6">
        {!data || data.documents.length === 0 || !result ? (
          <EmptyState
            icon={<FileSearchIcon />}
            title="No pay stubs checked yet"
            description="Upload a pay stub or W-2, or try a fictional sample. You confirm every field before anything is saved."
            actions={
              <ButtonLink href="/upload" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />}>
                Upload a pay stub
              </ButtonLink>
            }
          />
        ) : (
          <p className="text-sm text-fg-secondary">
            {result.findings.length === 0 ? "Everything looks good." : `${result.findings.length} items need attention.`}
          </p>
        )}
      </Card>
    </div>
  );
}
