import type { Metadata } from "next";
import { PersonaDemo } from "@/components/PersonaDemo";
import mock from "@/mocks/salaried.json";
import type { HouseholdData } from "@/lib/types";

export const metadata: Metadata = { title: "Demo: Nina & Marcus — PayTrail" };

export default function SalariedDemoPage() {
  return (
    <PersonaDemo
      household={(mock as unknown as { household: HouseholdData }).household}
      name="Nina & Marcus"
      subtitle="Married filing jointly · Texas · two salaried jobs · no children"
      story="Their W-4s are right: Nina already adds $150 per paycheck in Step 4(c), so April is about even. But Nina puts 3% of her pay into her 401(k), while her employer matches 100% up to 5%."
    />
  );
}
