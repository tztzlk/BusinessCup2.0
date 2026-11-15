import type { Metadata } from "next";
import { ResourcesView } from "./ResourcesView";

export const metadata: Metadata = { title: "Resources — PayTrail" };

export default function ResourcesPage() {
  return <ResourcesView />;
}
