import type { Metadata } from "next";
import { SettingsView } from "./SettingsView";

export const metadata: Metadata = { title: "Settings — PayTrail" };

export default function SettingsPage() {
  return <SettingsView />;
}
