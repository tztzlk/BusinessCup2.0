"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BookOpenIcon, ChevronDownIcon, ClipboardListIcon, ExternalLinkIcon, FileTextIcon, HelpCircleIcon, UploadIcon } from "lucide-react";
import { useHousehold } from "@/components/app/HouseholdProvider";
import { DISCLAIMER } from "@/components/Footer";
import { ANNUAL_FEATURES, Paywall } from "@/components/Paywall";
import { ChecklistView } from "@/components/report";
import { checklistItemsFor } from "@/components/ReportBody";
import { Alert, ButtonLink, Card, CardHeader, EmptyState, PageHeader, Skeleton, useToast } from "@/components/ui";
import { api } from "@/lib/api-client";
import { runCheckup, SUPPORTED_YEARS, federalParams } from "@/lib/engine";
import { GLOSSARY } from "@/lib/glossary";
import { isAnnual, ANNUAL_PRICE_LABEL } from "@/lib/plan";
import type { ChecklistItem, ChecklistStatus } from "@/lib/types";

// Reference material. The FAQ repeats only what the product already says on /privacy, /accuracy,
// the paywall and the upload page (each answer links to where it is stated); nothing new is claimed here.

const p = federalParams(SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1]);

const FAQ: Array<{ q: string; a: string; href?: string; link?: string }> = [
  {
    q: "Do you keep my pay stub?",
    a: "No. Claude reads your document once. We keep only the fields you confirm, never the file.",
    href: "/privacy#collect",
    link: "What we collect",
  },
  {
    q: "Do you need my Social Security number?",
    a: "No. We never keep names, SSNs, addresses, emails, passwords or bank numbers. You can cover your SSN before uploading.",
    href: "/privacy#never",
    link: "What we never collect",
  },
  {
    q: "How is my data protected?",
    a: "Each household's fields are encrypted with its own key, which we never store.",
    href: "/privacy#encryption",
    link: "How it's protected",
  },
  {
    q: "How do I delete my data?",
    a: "One click deletes everything: Settings → Privacy & data, or the household menu. Households not opened for 30 days are erased automatically.",
    href: "/privacy#deletion",
    link: "Deletion and automatic cleanup",
  },
  {
    q: "How do I open my data on another device?",
    a: "With your private recovery link. It opens your data on another device or after you clear cookies. Anyone with the link can open your data, so keep it like a password.",
    href: "/settings#privacy",
    link: "Show my private link",
  },
  {
    q: "How accurate are the numbers?",
    a: "The withholding engine reproduces all 4,350 amounts in the IRS's 2026 Pub. 15-T wage-bracket tables. Its annual federal tax matches two open-source tax models (PolicyEngine-US, Tax-Calculator) within $0.01 on 18 test households, including the Earned Income Tax Credit (Tax-Calculator matches 17 of 18; the one difference is a by-design married-filing-separately case).",
    href: "/accuracy",
    link: "Accuracy and limits",
  },
  {
    q: "Does PayTrail cover state taxes?",
    a: "Not yet. Federal income tax only: state and local income taxes are not calculated.",
    href: "/accuracy#limits",
    link: "What PayTrail doesn't cover yet",
  },
  {
    q: `What does Annual (${ANNUAL_PRICE_LABEL}) include?`,
    a: `${ANNUAL_FEATURES.join(". ")}. The free plan checks one pay stub.`,
    href: "/settings#plan",
    link: "Plan & billing",
  },
  { q: "Is this tax advice?", a: DISCLAIMER },
];

export function ResourcesView() {
  return (
    <div>
      <PageHeader title="Resources" subtitle="Learn more about your pay, taxes and benefits." />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Glossary />
        <div className="space-y-4">
          <Card>
            <CardHeader icon={<FileTextIcon className="h-5 w-5" />} title="IRS Publication 15-T" subtitle="2026 Federal Income Tax Withholding Methods" />
            <p className="mt-3 text-sm text-fg-secondary">The tables employers use to withhold federal income tax, and the ones our withholding check follows.</p>
            <a
              href={p.sources.pub15t}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
            >
              Open on irs.gov <ExternalLinkIcon aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Card>
          <Checklist />
        </div>
      </div>

      <section id="faq" className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-fg-primary">
          <HelpCircleIcon aria-hidden="true" className="h-5 w-5 text-primary" /> FAQ
        </h2>
        <Card padding="none" className="mt-3">
          <ul className="divide-y divide-border">
            {FAQ.map((f) => (
              <li key={f.q}>
                <details className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-fg-primary [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDownIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm text-fg-secondary">{f.a}</p>
                  {f.href && (
                    <Link href={f.href} className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
                      {f.link} →
                    </Link>
                  )}
                </details>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function Glossary() {
  return (
    <Card id="glossary">
      <CardHeader icon={<BookOpenIcon className="h-5 w-5" />} title="Tax terminology guide" subtitle="Plain-English definitions for the terms on your pay stub and report." />
      <dl className="mt-4 divide-y divide-border">
        {Object.entries(GLOSSARY).map(([key, g]) => (
          <div key={key} className="py-3">
            <dt className="font-medium text-fg-primary">{g.term}</dt>
            <dd className="mt-0.5 text-sm text-fg-secondary">{g.definition}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Checklist() {
  const toast = useToast();
  const { state, data, refresh } = useHousehold();
  const result = useMemo(() => (data ? runCheckup(data) : null), [data]);

  const save = async (item: ChecklistItem, status: ChecklistStatus) => {
    if (!data) return;
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
    <Card id="checklist">
      <CardHeader icon={<ClipboardListIcon className="h-5 w-5" />} title="January tax prep checklist" subtitle="The tax forms to expect, built from your jobs and household." />
      <div className="mt-4">
        {state.status === "loading" ? (
          <Skeleton className="h-24" />
        ) : state.status === "error" ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : !data || !result || data.employers.length === 0 ? (
          <EmptyState
            className="py-4"
            title="Add your household first"
            description="Your checklist is built from your jobs and household profile."
            actions={
              <ButtonLink href="/upload" size="sm" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />}>
                Start a checkup
              </ButtonLink>
            }
          />
        ) : !isAnnual(data) ? (
          <Paywall title="Tax season is part of Annual" reason="Your January checklist of tax forms, W-2 reconciliation against your pay stubs and the accountant packet are part of Annual." />
        ) : (
          <ChecklistView items={checklistItemsFor(data, result)} onStatusChange={(id, status) => {
            const item = checklistItemsFor(data, result).find((i) => i.id === id);
            if (item) save(item, status);
          }} />
        )}
      </div>
    </Card>
  );
}
