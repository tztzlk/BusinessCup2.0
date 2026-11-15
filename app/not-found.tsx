import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found — PayTrail" };

// Any unknown URL: the same header and footer as the public pages, and a way back.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:px-6">
        <p className="text-sm font-medium text-brand-700">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-fg-primary sm:text-3xl">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-fg-secondary">The link may be old or mistyped. Your data is not affected.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <ButtonLink href="/">Go to the home page</ButtonLink>
          <ButtonLink href="/dashboard" variant="secondary">
            Open my dashboard
          </ButtonLink>
          <ButtonLink href="/demo" variant="secondary">
            See sample households
          </ButtonLink>
        </div>
      </main>
      <Footer />
    </div>
  );
}
