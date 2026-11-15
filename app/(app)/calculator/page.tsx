import type { Metadata } from "next";
import { CalculatorView } from "./CalculatorView";

export const metadata: Metadata = { title: "Calculator — PayTrail" };

export default function CalculatorPage() {
  return <CalculatorView />;
}
