"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BookOpenIcon,
  CalculatorIcon,
  CreditCardIcon,
  HistoryIcon,
  HouseIcon,
  LayoutDashboardIcon,
  LinkIcon,
  LockIcon,
  RefreshCwIcon,
  ScaleIcon,
  SettingsIcon,
  Trash2Icon,
  UploadIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { DISCLAIMER } from "@/components/Footer";
import { DeletionScope } from "@/components/DeletionScope";
import { SaveLinkCard } from "@/components/SaveLinkCard";
import {
  Button,
  ButtonLink,
  Dropdown,
  Header,
  MobileDrawer,
  Modal,
  Sidebar,
  SidebarLink,
  ToastProvider,
  Tooltip,
  useToast,
  type DropdownItem,
} from "@/components/ui";
import { api } from "@/lib/api-client";
import { localDate } from "@/lib/format";
import { lastConfirmedAt } from "@/lib/householdMeta";
import { HouseholdProvider, useHousehold } from "./HouseholdProvider";
import { UploadQueueProvider } from "@/components/upload/UploadQueue";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other routes that belong to this item (highlighted with it). */
  also?: string[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, also: ["/upload", "/report"] },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/calculator", label: "Calculator", icon: CalculatorIcon },
  { href: "/resources", label: "Resources", icon: BookOpenIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const TRUST: NavItem[] = [
  { href: "/privacy", label: "Privacy", icon: LockIcon },
  { href: "/accuracy", label: "Accuracy & limits", icon: ScaleIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <HouseholdProvider>
        <UploadQueueProvider>
          <Shell>{children}</Shell>
        </UploadQueueProvider>
      </HouseholdProvider>
    </ToastProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const active = (item: NavItem) => [item.href, ...(item.also ?? [])].some((h) => path === h || path.startsWith(`${h}/`));

  const links = (rail: boolean) => (
    <ul className="space-y-1">
      {NAV.map((item) => (
        <li key={item.href}>
          <SidebarLink href={item.href} label={item.label} icon={item.icon} active={active(item)} rail={rail} onNavigate={() => setDrawer(false)} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar
        header={
          <Link href="/" aria-label="PayTrail home page" className="rounded-control">
            <span className="xl:hidden">
              <LogoMark size={28} className="h-7 w-auto text-fg-primary" />
            </span>
            <span className="hidden xl:inline-flex">
              <Logo size={26} onLight />
            </span>
          </Link>
        }
        footer={
          <>
            <ul className="space-y-1 xl:hidden">
              {TRUST.map((item) => (
                <li key={item.href}>
                  <SidebarLink href={item.href} label={item.label} icon={item.icon} active={active(item)} />
                </li>
              ))}
            </ul>
            <div className="hidden xl:block">
              <SecureCard />
            </div>
          </>
        }
      >
        {links(true)}
      </Sidebar>

      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} label="Menu">
        <div className="px-5 pb-4">
          <Logo size={26} onLight />
        </div>
        <nav aria-label="Main" className="flex-1 px-3">
          {links(false)}
        </nav>
        <div className="px-3 pb-6">
          <SecureCard onNavigate={() => setDrawer(false)} />
        </div>
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader menuOpen={drawer} onOpenMenu={() => setDrawer(true)} />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
          <p className="border-t border-border pt-4 text-[13px] font-medium text-fg-muted">{DISCLAIMER}</p>
        </footer>
      </div>
    </div>
  );
}

function SecureCard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="rounded-card bg-primary-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
        <LockIcon aria-hidden="true" className="h-4 w-4 text-primary" />
        Your data is secure &amp; private
      </div>
      <p className="mt-1 text-[13px] text-fg-secondary">Encrypted with your household&apos;s own key. Files are never stored.</p>
      <div className="mt-2 flex flex-col gap-1 text-[13px] font-medium">
        <Link href="/privacy" onClick={onNavigate} className="text-brand-700 hover:underline">
          How we protect it →
        </Link>
        <Link href="/accuracy" onClick={onNavigate} className="text-brand-700 hover:underline">
          Accuracy &amp; limits →
        </Link>
      </div>
    </div>
  );
}

function AppHeader({ menuOpen, onOpenMenu }: { menuOpen: boolean; onOpenMenu: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const { state, data, refresh, clear } = useHousehold();
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<"link" | "delete" | null>(null);
  const [deleting, setDeleting] = useState(false);

  const checked = data ? lastConfirmedAt(data) : null;

  const reload = async () => {
    setRefreshing(true);
    try {
      const d = await refresh();
      toast(d ? { title: "Data refreshed" } : { tone: "info", title: "No saved household in this browser" });
    } catch (e) {
      toast({ tone: "danger", title: "Couldn't refresh", description: e instanceof Error ? e.message : undefined });
    } finally {
      setRefreshing(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.deleteHousehold();
      clear();
      setModal(null);
      toast({ title: "Your data was deleted", description: "Everything listed was removed from PayTrail and this browser." });
      router.push("/");
    } catch (e) {
      toast({ tone: "danger", title: "Couldn't delete your data", description: e instanceof Error ? e.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  const items: DropdownItem[] =
    state.status === "ready"
      ? [
          { id: "settings", label: "Settings", icon: <SettingsIcon />, href: "/settings" },
          { id: "link", label: "Save recovery link", icon: <LinkIcon />, onSelect: () => setModal("link") },
          { id: "plan", label: "Plan & billing", icon: <CreditCardIcon />, href: "/settings#plan" },
          { id: "home", label: "PayTrail home page", icon: <HouseIcon />, href: "/" },
          { id: "delete", label: "Delete my data", icon: <Trash2Icon />, tone: "danger", onSelect: () => setModal("delete") },
        ]
      : [
          { id: "start", label: "Check a pay stub", icon: <UploadIcon />, href: "/upload" },
          { id: "settings", label: "Settings", icon: <SettingsIcon />, href: "/settings" },
          { id: "home", label: "PayTrail home page", icon: <HouseIcon />, href: "/" },
        ];

  return (
    <>
      <Header
        menuOpen={menuOpen}
        onOpenMenu={onOpenMenu}
        left={
          <>
            <Link href="/" aria-label="PayTrail home page" className="rounded-control md:hidden">
              <LogoMark size={26} className="h-[26px] w-auto text-fg-primary" />
            </Link>
            {checked && (
              <p className="truncate text-[13px] text-fg-muted">
                <span className="hidden sm:inline">Last checked: </span>
                <span className="sm:hidden">Checked </span>
                <time dateTime={checked}>{localDate(checked)}</time>
              </p>
            )}
          </>
        }
        right={
          <>
            <Tooltip content="Back to the PayTrail home page" side="bottom">
              <Link
                href="/"
                aria-label="Home page"
                className="flex items-center gap-1.5 rounded-control p-2 text-sm font-medium text-fg-secondary hover:bg-slate-100 sm:px-3"
              >
                <HouseIcon aria-hidden="true" className="h-5 w-5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
            </Tooltip>
            {state.status === "ready" && (
              <Tooltip content="Reload your data" side="bottom">
                <button
                  type="button"
                  onClick={reload}
                  disabled={refreshing}
                  aria-label="Refresh data"
                  className="rounded-control p-2 text-fg-secondary hover:bg-slate-100 disabled:opacity-60"
                >
                  <RefreshCwIcon aria-hidden="true" className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </Tooltip>
            )}
            <ButtonLink href="/upload" size="sm" icon={<UploadIcon aria-hidden="true" className="h-4 w-4" />} aria-label="Upload a document" className="px-2.5 sm:px-3">
              <span className="hidden sm:inline">Upload</span>
            </ButtonLink>
            <Dropdown
              label="My account"
              trigger={<UserRoundIcon aria-hidden="true" className="h-5 w-5" />}
              buttonClassName="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary hover:bg-primary-100"
              header={
                <p className="text-[13px] text-fg-muted">
                  {state.status === "ready"
                    ? `Your household · ${data?.plan?.tier === "annual" ? "Annual" : "Free plan"}`
                    : "No household in this browser yet"}
                </p>
              }
              items={items}
            />
          </>
        }
      />

      <Modal open={modal === "link"} onClose={() => setModal(null)} title="Save your recovery link" description="It opens your data on another device or after you clear cookies.">
        <SaveLinkCard annual={data?.plan?.tier === "annual"} />
      </Modal>

      <Modal
        open={modal === "delete"}
        onClose={() => (deleting ? undefined : setModal(null))}
        title="Delete my data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={deleting}>
              Keep my data
            </Button>
            <Button variant="danger" loading={deleting} onClick={remove}>
              {deleting ? "Deleting…" : "Delete my data"}
            </Button>
          </>
        }
      >
        <DeletionScope />
      </Modal>
    </>
  );
}
