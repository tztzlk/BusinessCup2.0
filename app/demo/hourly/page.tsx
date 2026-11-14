import type { Metadata } from "next";
import { PersonaDemo } from "@/components/PersonaDemo";
import mock from "@/mocks/hourly.json";
import type { HouseholdData } from "@/lib/types";

export const metadata: Metadata = { title: "Demo: Rosa & Tom — PayTrail" };

export default function HourlyDemoPage() {
  return (
    <PersonaDemo
      household={(mock as unknown as { household: HouseholdData }).household}
      name="Rosa & Tom"
      subtitle="Married filing jointly · Texas · hourly warehouse job + salaried job · two children"
      story="Rosa is paid $22 an hour. In her last two-week pay period she worked 92 hours, but the stub pays every hour at the regular rate, with no overtime line. Their W-4s are set up right, so April is about even."
    />
  );
}
