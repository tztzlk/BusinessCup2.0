import type { Metadata } from "next";
import { RecoverView } from "./RecoverView";

export const metadata: Metadata = { title: "Open my data — PayTrail" };

export default function RecoverPage() {
  return <RecoverView />;
}
