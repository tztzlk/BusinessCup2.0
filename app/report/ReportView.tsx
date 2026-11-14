"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { Badge, Button, ButtonLink, Card, Notice, Section } from "@/components/ui";
import { HouseholdSummary } from "@/components/report";
import { ReportEngineSection } from "@/components/ReportEngineSection";
import { money, shortDate } from "@/lib/format";
import type { HouseholdData, Paystub, W2 } from "@/lib/types";

export function ReportView() {
  const router = useRouter();
  const [data, setData] = useState<HouseholdData | null>(null);
  const [state, setState] = useState<"loading" | "none" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

      <ReportEngineSection data={data} onChanged={() => api.getHousehold().then(setData).catch(() => undefined)} />

      <Section title="Household">
        <HouseholdSummary profile={data.profile} employers={data.employers} documents={data.documents} />
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
                  <p className="font-mono text-slate-800">
                    {d.docType === "paystub" ? `${money((d.fields as Paystub).grossCurrent)} gross` : `${money((d.fields as W2).box1Wages)} box 1`}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Section>


      <Section title="Your data">
        <Card>
          <p className="text-sm text-slate-600">
            Deleting removes your household, jobs, documents and checklist from our servers immediately. This can&apos;t be undone.
          </p>
          <Button
            type="button"
            variant="danger"
            className="mt-4"
            disabled={deleting}
            onClick={async () => {
              if (!window.confirm("Delete all your PayTrail data? This can't be undone.")) return;
              setDeleting(true);
              try {
                await api.deleteHousehold();
                router.push("/");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not delete.");
                setDeleting(false);
              }
            }}
          >
            {deleting ? "Deleting…" : "Delete my data"}
          </Button>
        </Card>
      </Section>
    </div>
  );
}
