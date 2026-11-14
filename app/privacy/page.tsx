import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy policy — PayTrail",
  description: "What PayTrail collects, how it is encrypted, who else processes it, and how to delete it.",
};

// Keep every statement here true to the code: lib/household.ts (cleanup, deletion), lib/crypto.ts (keys),
// lib/db.ts (what is plain text), lib/billing.ts (Stripe), fly.toml (region). Change this page with the code.
const UPDATED = "15 November 2026";

const ANTHROPIC_RETENTION = "https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data";
const ANTHROPIC_API_DATA = "https://platform.claude.com/docs/en/manage-claude/api-and-data-retention";
const STRIPE_PRIVACY = "https://stripe.com/privacy";
const FLY_VOLUMES = "https://fly.io/docs/volumes/overview/";
const FLY_SNAPSHOTS = "https://fly.io/docs/volumes/snapshots/";

const SUMMARY = [
  ["Fields, not files", "Claude reads your document once. We keep only the fields you confirm, never the file."],
  ["No identity data", "We never keep names, SSNs, addresses, emails, passwords or bank numbers."],
  ["Encrypted per household", "Each household's fields are encrypted with its own key, which we never store."],
  ["Gone when you say so", "One click deletes everything. Households not opened for 30 days are erased automatically."],
];

const COLLECTED: [string, string, string][] = [
  [
    "Household: filing status, state, number of children and other dependents, and whether you have a mortgage, savings interest, a brokerage account or an HSA",
    "April projection and your January form checklist",
    "Encrypted",
  ],
  [
    "Jobs: employer name, whether the job is yours or your spouse's, salary or hourly rate, 401(k) match rule, W-4 settings",
    "Withholding check and the W-4 fix for each job",
    "Encrypted (whose job it is: plain text)",
  ],
  [
    "Pay stub and W-2 fields you confirmed: pay dates, hours, earnings, taxes withheld, deductions, year-to-date totals, W-2 boxes",
    "The checkup itself",
    "Encrypted (document type and tax year: plain text)",
  ],
  ["Tax-form checklist: which forms you expect and whether they arrived", "January mode", "Who sends the form: encrypted. Form type, status, due date: plain text"],
  ["Plan: Free or Annual, when Annual ends, the Stripe Checkout session ID", "Unlocking Annual", "Plain text"],
  [
    "Security log: what happened (created, opened, added a document) and when, with a one-way keyed hash of your IP address",
    "Spotting abuse",
    "Plain text. The hash key is random and changes on every server restart. Kept 30 days at most",
  ],
];

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-20 text-xl font-semibold text-slate-900">
      {children}
    </h2>
  );
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900">
      {children}
    </a>
  );
}

const TOC = [
  ["collect", "What we collect"],
  ["never", "What we never collect"],
  ["encryption", "How it's protected"],
  ["processors", "Who else handles your data"],
  ["cookies", "Cookies and browser storage"],
  ["deletion", "Deletion and automatic cleanup"],
] as const;

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl text-slate-700">
      <p className="text-sm text-slate-500">Last updated {UPDATED}</p>
      <h1 className="mt-1 text-3xl font-semibold text-slate-900">Privacy policy</h1>
      <p className="mt-3 text-lg leading-relaxed">
        PayTrail works with documents that have your salary on them. This page says exactly what we keep, where it goes and how
        to remove it.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SUMMARY.map(([title, body]) => (
          <Card key={title} className="p-4">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{body}</p>
          </Card>
        ))}
      </div>

      <nav aria-label="On this page" className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-medium text-slate-900">On this page</p>
        <ol className="mt-2 grid gap-1 sm:grid-cols-2">
          {TOC.map(([id, label], i) => (
            <li key={id}>
              <a href={`#${id}`} className="text-brand-700 hover:underline">
                {i + 1}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <H2 id="collect">1. What we collect</H2>
      <p className="mt-2">
        Only what the checkup needs, and only after you confirm it. There is no sign-up: your household is created when you check
        your first pay stub.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Data</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Why</th>
              <th scope="col" className="px-4 py-2.5 font-medium">How it&apos;s stored</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white align-top">
            {COLLECTED.map(([what, why, how]) => (
              <tr key={what}>
                <td className="px-4 py-3 text-slate-900">{what}</td>
                <td className="px-4 py-3">{why}</td>
                <td className="px-4 py-3">{how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">
        The few plain-text fields are there so the app can sort and look things up without your key: dates, types, statuses and
        random IDs, never amounts. Rate limits count requests in memory for 10 minutes and are never written to disk.
      </p>

      <H2 id="never">2. What we never collect</H2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>
          <strong className="text-slate-900">Your document file.</strong> It is read in memory and discarded. It is never written to our
          disk or database.
        </li>
        <li>
          <strong className="text-slate-900">Identity data:</strong> your name, Social Security number, home address, email, phone, password,
          bank account or card numbers. PayTrail never asks for them, and the fields we read from a document don&apos;t include them.
        </li>
        <li>
          <strong className="text-slate-900">Tracking:</strong> no analytics, advertising or third-party scripts.
        </li>
      </ul>
      <p className="mt-3 text-sm">
        A W-2 does show your SSN, and the image goes to Claude to be read (see section 4). You can cover the SSN before uploading: we
        don&apos;t need it.
      </p>

      <H2 id="encryption">3. How it&apos;s protected</H2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>
          <strong className="text-slate-900">Field-level encryption.</strong> Each household&apos;s data is encrypted with AES-256-GCM using its
          own key. We never store that key: it is rebuilt in memory for each request from a secret kept in your browser and our
          server key. A copy of our database alone is unreadable.
        </li>
        <li>
          <strong className="text-slate-900">Encrypted disk.</strong> The database sits on a Fly.io volume that is encrypted at rest (
          <Ext href={FLY_VOLUMES}>Fly.io volumes</Ext>).
        </li>
        <li>
          <strong className="text-slate-900">Secrets out of the code.</strong> Our server key lives in Fly.io&apos;s encrypted secrets store, not
          in the code or the database.
        </li>
        <li>
          <strong className="text-slate-900">HTTPS only.</strong> Plain HTTP is redirected to HTTPS.
        </li>
      </ul>
      <p className="mt-3 text-sm">
        What this does not protect against: while you use PayTrail, our server holds your key in memory to read your data. Someone
        who took over the running server could read the data of people using it at that moment.
      </p>

      <H2 id="processors">4. Who else handles your data</H2>
      <div className="mt-4 space-y-4">
        <Card>
          <h3 className="font-semibold text-slate-900">Anthropic (Claude API): reads documents, writes explanations</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            <li>When you upload a pay stub or W-2, the file is sent once to Anthropic&apos;s commercial API so Claude can read its fields.</li>
            <li>For plain-language explanations Claude gets only finding codes and numbers, no names or document fields.</li>
            <li>
              Anthropic doesn&apos;t use API data to train models without permission, and deletes API inputs and outputs within 30 days.
              Exceptions: requests flagged for a usage-policy violation can be kept longer (up to 2 years), and data can be kept
              where the law requires it.
            </li>
            <li>We don&apos;t have a zero-data-retention agreement with Anthropic yet.</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Sources: <Ext href={ANTHROPIC_RETENTION}>How long do you store my organization&apos;s data?</Ext> ·{" "}
            <Ext href={ANTHROPIC_API_DATA}>API and data retention</Ext>
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900">Stripe: payments for Annual</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            <li>You pay on Stripe&apos;s Checkout page. Your card details and the email Stripe asks for go to Stripe; we never see or store them.</li>
            <li>We send Stripe your household&apos;s random ID so the payment can be matched to it. We keep the Checkout session ID and the date Annual ends.</li>
            <li>
              Stripe keeps its own payment records under its <Ext href={STRIPE_PRIVACY}>privacy policy</Ext>.
            </li>
            <li>During Business Cup 2.0, checkout runs in Stripe test mode: no real card is charged.</li>
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900">Fly.io: hosting, Frankfurt, Germany</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            <li>The app and its database run on Fly.io in the Frankfurt region (fra). Your data is stored in Germany.</li>
            <li>
              Fly.io takes automatic daily snapshots of the database disk and keeps them for 5 days by default (
              <Ext href={FLY_SNAPSHOTS}>Fly.io snapshots</Ext>). Snapshots of an encrypted volume are encrypted too.
            </li>
          </ul>
        </Card>
      </div>

      <H2 id="cookies">5. Cookies and browser storage</H2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>
          <strong className="text-slate-900">One cookie, pt_hh.</strong> It holds your household&apos;s secret, the other half of your key. Page
          scripts can&apos;t read it (httpOnly), it is never sent to other sites (SameSite=Strict), and it expires 30 days after your last
          visit. Without it, PayTrail can&apos;t open your data.
        </li>
        <li>
          <strong className="text-slate-900">Explanation cache (localStorage).</strong> The last 20 plain-language explanations are kept in your
          browser so a reload doesn&apos;t ask Claude again. They hold finding codes, dollar amounts and text, no names.
        </li>
        <li>
          <strong className="text-slate-900">A document waiting for checkout (sessionStorage).</strong> If the free plan is used up, the fields you
          just confirmed wait in that tab while you pay, for up to 1 hour. Closing the tab clears them.
        </li>
        <li>No analytics, advertising or tracking cookies.</li>
      </ul>

      <H2 id="deletion">6. Deletion and automatic cleanup</H2>
      <Card className="mt-4">
        <h3 className="font-semibold text-slate-900">Delete everything, any time</h3>
        <p className="mt-1 text-sm">
          Use <Link href="/report" className="font-medium text-brand-700 underline underline-offset-2">My report</Link> or{" "}
          <Link href="/account" className="font-medium text-brand-700 underline underline-offset-2">Account</Link>. One click removes, right away:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>your household profile and jobs</li>
          <li>every saved pay stub and W-2</li>
          <li>your tax-form checklist and plan record</li>
          <li>your entries in the security log</li>
          <li>the cookie and the cached explanations in this browser</li>
        </ul>
        <p className="mt-2 text-sm">
          Your private link stops working. We keep one log line saying that a household was deleted and when, with no household ID
          and no IP hash. You can also delete a single document from My report.
        </p>
      </Card>
      <Card className="mt-4">
        <h3 className="font-semibold text-slate-900">Automatic cleanup</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>A household nobody has opened for 30 days is deleted automatically. The check runs every hour.</li>
          <li>Households on Annual are kept until the paid year ends.</li>
          <li>Security log entries are deleted after 30 days.</li>
        </ul>
      </Card>
      <Card className="mt-4">
        <h3 className="font-semibold text-slate-900">What deletion can&apos;t reach</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Fly.io disk snapshots: a deleted household can stay in them until they expire (5 days by default). It stays encrypted there.</li>
          <li>Anthropic: the copy of an uploaded document is deleted on Anthropic&apos;s side within 30 days, with the exceptions in section 4.</li>
          <li>Stripe: payment records stay with Stripe.</li>
        </ul>
      </Card>

      <h2 className="mt-10 text-xl font-semibold text-slate-900">Who we are</h2>
      <p className="mt-2">
        PayTrail is a prototype built at Business Cup 2.0 (14–15 November 2026) by team ENUshniki. When what we do with data changes,
        we update this page and the date at the top. See also{" "}
        <Link href="/accuracy" className="font-medium text-brand-700 underline underline-offset-2">
          Accuracy and limits
        </Link>
        .
      </p>
    </article>
  );
}
