import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

// Public pages: landing, demo households (the jury's entry, no sign-in), about, recovery and the Stripe return.
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <Footer />
    </div>
  );
}
