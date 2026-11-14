import type { Metadata } from "next";
import { ReportView } from "./ReportView";

export const metadata: Metadata = { title: "My report — PayTrail" };

export default function ReportPage() {
  return <ReportView />;
}
