"use client";

import Link from "next/link";
import { Notice, Section } from "./ui";
import type { HouseholdData } from "@/lib/types";

// Placeholder for the calculation results. When lib/engine lands, compute
// findings + projection from `data` here and render ProjectionBanner,
// FindingCard and W4Card from components/report.tsx.
export function ReportEngineSection({ data }: { data: HouseholdData }) {
  const stubs = data.documents.filter((d) => d.docType === "paystub").length;
  return (
    <Section title="Your checkup">
      <Notice tone="info">
        Calculations coming in the next build. You have {stubs} pay stub{stubs === 1 ? "" : "s"} saved — your April projection,
        findings and W-4 fixes will appear here. See the{" "}
        <Link href="/demo/couple" className="font-medium underline">
          sample report
        </Link>{" "}
        for what it will look like.
      </Notice>
    </Section>
  );
}
