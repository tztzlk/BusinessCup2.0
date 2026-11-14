import type { Metadata } from "next";
import { CheckFlow } from "./CheckFlow";

export const metadata: Metadata = { title: "Check my pay stub — PayTrail" };

export default function CheckPage() {
  return <CheckFlow />;
}
