import type { Metadata } from "next";
import { ReviewView } from "./ReviewView";

export const metadata: Metadata = { title: "Review — PayTrail" };

export default function ReviewPage() {
  return <ReviewView />;
}
