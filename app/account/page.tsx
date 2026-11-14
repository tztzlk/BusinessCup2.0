import type { Metadata } from "next";
import { AccountView } from "./AccountView";

export const metadata: Metadata = { title: "My account — PayTrail" };

export default function AccountPage() {
  return <AccountView />;
}
