import type { Metadata } from "next";
import { CoupleDemo } from "./CoupleDemo";

export const metadata: Metadata = { title: "Demo: Alex & Jordan — PayTrail" };

export default function CoupleDemoPage() {
  return <CoupleDemo />;
}
