import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, ButtonLink, Card, Alert, Section } from "@/components/ui";
import { UsersIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "About — PayTrail",
  description: "PayTrail is a hackathon prototype built by team ENUshniki, students at Nazarbayev University, at Business Cup 2.0.",
};

const REPO = "https://github.com/tztzlk/BusinessCup2.0";

const TEAM = [
  { name: "Max", role: "Product and backend" },
  { name: "Aldik", role: "Frontend and QA" },
  { name: "Mans", role: "Research and pitch" },
];

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-600">
      {children}
    </a>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Badge tone="warning">Hackathon prototype</Badge>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">About PayTrail</h1>
      <p className="mt-2 text-slate-600">
        PayTrail checks pay stubs for US households with W-2 jobs, projects whether they will owe or get a refund in April, and helps them
        get ready for tax season. We built it as a prototype at Business Cup 2.0, 14–15 November 2026.
      </p>

      <Section title="Why we built it">
        <Card>
          <p className="text-sm text-slate-700">
            Tax rates rise with income, and a tax return gets only one standard deduction however many jobs it covers. That is why
            the IRS writes:
          </p>
          <blockquote className="mt-3 border-l-4 border-brand-300 pl-4 text-sm italic text-slate-700">
            &ldquo;You are more likely to need to increase your withholding if … you are married filing jointly and your spouse also
            works.&rdquo;
          </blockquote>
          <p className="mt-2 text-xs text-slate-500">
            <Ext href="https://www.irs.gov/pub/irs-pdf/p505.pdf">IRS Publication 505 (2026)</Ext>, chapter 1
          </p>
        </Card>
      </Section>

      <Section title="Who built it">
        <Card>
          <div className="flex items-start gap-3">
            <UsersIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <p className="text-sm text-slate-700">
              Team <strong className="text-slate-900">ENUshniki</strong>, students at Nazarbayev University in Astana, Kazakhstan.
            </p>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {TEAM.map((m) => (
              <li key={m.name} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-900">{m.name}</p>
                <p className="text-sm text-slate-600">{m.role}</p>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title="What PayTrail is today">
        <Card>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>A prototype built during a hackathon, not a registered company.</li>
            <li>
              No real payments: checkout runs in Stripe test mode, so the Annual plan can be tried with a test card and nothing is charged.
            </li>
            <li>
              The source code is public on <Ext href={REPO}>GitHub</Ext>, including how we tested the tax engine.
            </li>
          </ul>
          <div className="mt-4">
            <Alert tone="warning">
              <strong>Estimates only. Not tax advice. Not affiliated with the IRS. Not reviewed by a CPA.</strong>
            </Alert>
          </div>
        </Card>
      </Section>

      <Section title="Learn more">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/privacy" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <h3 className="font-semibold text-slate-900">Privacy</h3>
              <p className="mt-1 text-sm text-slate-600">What we collect, how it is encrypted, what goes to Anthropic and how to delete it.</p>
              <p className="mt-3 text-sm font-medium text-brand-700 group-hover:underline">Read the privacy page →</p>
            </Card>
          </Link>
          <Link href="/accuracy" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <h3 className="font-semibold text-slate-900">Accuracy</h3>
              <p className="mt-1 text-sm text-slate-600">How the numbers are calculated, the IRS sources, how we checked them and what isn&apos;t covered.</p>
              <p className="mt-3 text-sm font-medium text-brand-700 group-hover:underline">Read the accuracy page →</p>
            </Card>
          </Link>
        </div>
      </Section>

      <Section title="Contact">
        <Card>
          <p className="text-sm text-slate-700">
            Contact the team through the <Ext href={REPO}>GitHub repository</Ext>.
          </p>
          <ButtonLink href={REPO} variant="secondary" className="mt-4">
            Open the repository
          </ButtonLink>
        </Card>
      </Section>
    </div>
  );
}
