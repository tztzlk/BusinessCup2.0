import type { Metadata } from "next";
import { CoupleDemo } from "./CoupleDemo";

export const metadata: Metadata = { title: "Demo: Alex & Jordan — PayTrail" };

export default async function CoupleDemoPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <CoupleDemo initialMode={view === "january" ? "january" : "november"} />;
}
