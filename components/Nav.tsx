"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { Logo, LogoMark } from "./Logo";
import { LayoutDashboardIcon, LayoutGridIcon, ScanLineIcon } from "lucide-react";

type NavItem = {
  href: string;
  /** Full label on wider screens. */
  label: string;
  /** Short label under the icon on phones. */
  short: string;
  /** Tooltip: what the page is for. */
  hint: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const LINKS: NavItem[] = [
  { href: "/demo", label: "Sample households", short: "Samples", hint: "See finished checkups for fictional families — no upload", icon: LayoutGridIcon },
  { href: "/dashboard", label: "Dashboard", short: "Dashboard", hint: "Your checkup status, April outlook and paycheck history", icon: LayoutDashboardIcon },
];

const CTA: NavItem = { href: "/upload", label: "Check my pay stub", short: "Check", hint: "Upload a pay stub or W-2 and get it checked", icon: ScanLineIcon };

// The layout keeps the nav mounted across client navigation, so the logo animates once per visit.
export function Nav() {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <header className="no-print sticky top-0 z-20 border-b border-white/10 bg-ink/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
        <Link href="/" aria-label="PayTrail home" className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-brand-400">
          {/* Phones: the mark alone, so four nav items fit at 375 px. */}
          <span className="sm:hidden">
            <LogoMark size={26} animate className="h-[26px] w-auto text-white" />
          </span>
          <span className="hidden sm:inline-flex">
            <Logo size={26} animate />
          </span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          {LINKS.map(({ href, label, short, hint, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={hint}
              aria-current={active(href) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[11px] min-[380px]:px-2.5 leading-tight sm:flex-row sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm ${
                active(href) ? "bg-white/15 text-white" : "text-brand-100 hover:bg-white/10"
              }`}
            >
              <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <Link
            href={CTA.href}
            title={CTA.hint}
            aria-current={active(CTA.href) ? "page" : undefined}
            className="ml-1 flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-500 px-2.5 py-2 sm:gap-2 sm:px-3 font-medium text-white transition-colors hover:bg-brand-400"
          >
            <CTA.icon className="h-4 w-4" />
            <span className="sm:hidden">{CTA.short}</span>
            <span className="hidden sm:inline">{CTA.label}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
