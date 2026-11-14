import { AppShell } from "@/components/app/AppShell";

// The product: sidebar, header and the household's data shared by every page.
export default function ProductLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
