import type { Metadata } from "next";
import { UploadFlow } from "./UploadFlow";

export const metadata: Metadata = { title: "Upload — PayTrail" };

export default function UploadPage() {
  return <UploadFlow />;
}
