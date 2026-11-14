import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Card, Notice, Section } from "@/components/ui";
import { IconClock, IconFileText, IconLock, IconMapPin } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Privacy — PayTrail",
  description: "What PayTrail collects, where it is stored, how it is encrypted, what goes to Anthropic, and how to delete it.",
};

// Every statement here describes the code in this repository (lib/crypto.ts, lib/household.ts, lib/db.ts,
// app/api/extract, lib/extraction.ts, lib/billing.ts, components/useExplanations.ts, lib/pendingDocument.ts,
// fly.toml) or the providers' published policies. Update this page when that code changes.

const REPO = "https://github.com/tztzlk/BusinessCup2.0";
const UPDATED = "15 November 2026";

const AT_A_GLANCE = [
  {
    icon: IconFileText,
    title: "Your files are not stored",
    body: "A pay stub or W-2 is held in memory while it is read, then discarded. Only the fields you confirm are saved.",
  },
  {
    icon: IconLock,
    title: "Field-level encryption",
    body: "Saved fields are encrypted with a key rebuilt on each request from a secret in your browser and a server key.",
  },
  {
    icon: IconClock,
    title: "Deleted after 30 days",
    body: "Data inactive for 30 days is removed automatically. Delete my data removes it immediately.",
  },
  {
    icon: IconMapPin,
    title: "Hosted in Frankfurt",
    body: "One server on Fly.io in the Frankfurt region, with the database on a volume encrypted at rest.",
  },
];

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">{children}</ul>;
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-600">
      {children}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Badge tone="warning">Hackathon prototype</Badge>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">Privacy</h1>
      <p className="mt-2 text-slate-600">
        PayTrail is a prototype built by a student team at Business Cup 2.0, not a registered company. This page describes what the code
        running this site actually does. The code is public, so you can check every statement on{" "}
        <Ext href={REPO}>GitHub</Ext>.
      </p>
      <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {AT_A_GLANCE.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <h2 className="font-semibold text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Section title="What we collect">
        <Card>
          <p className="text-sm text-slate-600">Only what the checkup needs. Document fields are saved only after you confirm them.</p>
          <div className="mt-3">
            <List>
              <li>
                <strong className="text-slate-900">Household profile:</strong> filing status, state, number of children under 17 and other
                dependents, and yes/no answers about a mortgage, savings interest, a brokerage account and an HSA.
              </li>
              <li>
                <strong className="text-slate-900">Jobs:</strong> employer name, whether the job is yours or your spouse&apos;s, salary or
                hourly rate, overtime eligibility, the 401(k) match rule and your W-4 settings.
              </li>
              <li>
                <strong className="text-slate-900">Documents:</strong> the fields you confirm from a pay stub (employer name, pay dates and
                frequency, earnings, taxes, deductions, employer contributions, totals) or from a W-2 (tax year, employer name, boxes 1–6, 12,
                13 and the state boxes).
              </li>
              <li>
                <strong className="text-slate-900">Tax-season checklist:</strong> form type, who sends it, its status and due date.
              </li>
              <li>
                <strong className="text-slate-900">Plan:</strong> Free or Annual, the date Annual ends, and the Stripe Checkout session ID.
              </li>
              <li>
                <strong className="text-slate-900">Activity log:</strong> what happened (household created, data read, document added or
                deleted, private link shown), when, and a hash of your IP address. The hash uses a random salt that lives only in the running server&apos;s
                memory and is never saved, so it cannot be turned back into your IP address from a copy of the database.
              </li>
            </List>
          </div>
          <h3 className="mt-5 font-semibold text-slate-900">What we don&apos;t collect</h3>
          <p className="mt-1 text-sm text-slate-600">
            No account, password or email address. We don&apos;t ask for your name, Social Security number, home address, date of birth, phone
            number or bank account numbers, and our document reader has no field for them. We never see card numbers (see Payments). There
            are no analytics, advertising or third-party tracking scripts on this site.
          </p>
        </Card>
      </Section>

      <Section title="Where it is stored">
        <Card>
          <List>
            <li>
              On one server at <Ext href="https://fly.io">Fly.io</Ext> in its Frankfurt, Germany region, in a SQLite database on a Fly
              volume. Fly encrypts volumes at rest.
            </li>
            <li>
              Uploaded files are never written to disk or to the database. The file stays in the server&apos;s memory for the one request
              that reads it and is dropped when the request ends.
            </li>
            <li>
              We don&apos;t run separate backups of the database. Fly.io may keep its own snapshots of the volume; data in them is encrypted
              the same way as below.
            </li>
          </List>
        </Card>
      </Section>

      <Section title="How it is protected">
        <Card>
          <List>
            <li>
              Every saved field is encrypted with AES-256-GCM. Each household has its own key, derived (HKDF-SHA256) from a random secret
              kept in your browser&apos;s cookie together with a server key.
            </li>
            <li>
              The key is rebuilt for each request and never stored. The database keeps only a SHA-256 hash of your secret, used to find your
              household. Each encrypted value is bound to its table, row and household, so it can&apos;t be moved to another row.
            </li>
            <li>
              A copy of the database alone is unreadable, and so is a copy of the database together with the server key: your secret is
              needed too. The server key and our API keys are kept as Fly secrets, which Fly stores encrypted and passes to the app as
              environment variables.
            </li>
            <li>
              The site only works over HTTPS, and our API rejects requests sent from other websites. Uploads, explanations and new
              households are rate limited.
            </li>
          </List>
          <div className="mt-4">
            <Notice tone="warning">
              <strong>The limits.</strong> While handling a request from your browser, the server holds your key and can read your data;
              that is how it shows you your report. Encryption protects a copy of the database, not a server that someone has taken over: a
              person in control of the server could change the code to read data on your next visit. This is not end-to-end encryption.
            </Notice>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            A few service fields stay unencrypted so the database can find and clean up rows: random IDs, whether a job is yours or your
            spouse&apos;s, document type and tax year, checklist form type, status and due date, timestamps, your plan and its end date, and
            the Stripe Checkout session ID.
          </p>
        </Card>
      </Section>

      <Section title="What goes to Anthropic">
        <Card>
          <h3 className="font-semibold text-slate-900">Reading your document</h3>
          <p className="mt-1 text-sm text-slate-700">
            To read a pay stub or W-2, the server sends the whole file to Anthropic&apos;s API, where Claude copies its values into a fixed
            list of fields. Anthropic receives everything printed on the file, which can include your name, address and Social Security
            number. Our instructions and the list of fields have no place for those, so they are not returned to us and not saved. You
            review and can correct every field before anything is saved. The reader doesn&apos;t need your SSN or address, so you can cover
            them before uploading.
          </p>
          <h3 className="mt-5 font-semibold text-slate-900">Writing explanations</h3>
          <p className="mt-1 text-sm text-slate-700">
            The plain-English explanations in your report are written by Claude from finding codes and the numbers our engine computed. No
            names, employer names or other text are sent.
          </p>
          <h3 className="mt-5 font-semibold text-slate-900">How Anthropic treats it</h3>
          <p className="mt-1 text-sm text-slate-700">
            Anthropic doesn&apos;t train its models on data sent through its commercial API without permission. It deletes API inputs and
            outputs within 30 days, except content flagged for Usage Policy violations (kept up to 2 years) or data it must keep by law. We
            do not have a Zero Data Retention agreement with Anthropic. See the{" "}
            <Ext href="https://www.anthropic.com/legal/privacy">Anthropic privacy policy</Ext>.
          </p>
        </Card>
      </Section>

      <Section title="Payments">
        <Card>
          <List>
            <li>
              Annual is paid through <Ext href="https://stripe.com/privacy">Stripe</Ext> Checkout. You enter card details on Stripe&apos;s
              page; we never see or store card numbers.
            </li>
            <li>
              We send Stripe a random household ID and the price. We store only your plan, the date it ends and the Checkout session ID.
            </li>
            <li>
              Stripe keeps its own payment records under its own policy; deleting your PayTrail data doesn&apos;t delete them.
            </li>
            <li>This prototype runs in Stripe test mode: no real payments are taken.</li>
          </List>
        </Card>
      </Section>

      <Section title="Cookies and browser storage">
        <Card>
          <p className="text-sm text-slate-700">
            PayTrail sets one cookie, <code className="rounded bg-slate-100 px-1 font-mono text-xs">pt_hh</code>, when you start a checkup
            on Check my pay stub (with your own document or the sample pay stub). It holds your household secret and is httpOnly (page scripts can&apos;t read it), Secure (sent only over
            HTTPS) and SameSite=Strict (not sent with requests from other sites). It lasts 30 days and is renewed each time PayTrail loads
            your household. Browsing the sample households doesn&apos;t set it.
          </p>
          <p className="mt-3 text-sm text-slate-700">Two things are kept in your browser, not on our server:</p>
          <div className="mt-2">
            <List>
              <li>
                Explanation texts, with the finding codes and numbers they were written from, for up to 20 recent sets of findings, so
                reloading a report doesn&apos;t request them again (local storage).
              </li>
              <li>
                If the free plan is used up when you confirm a document, its confirmed fields wait in this tab (session storage) while you go
                through checkout, for up to one hour. They are removed once saved, and when the tab closes.
              </li>
            </List>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Delete my data doesn&apos;t clear these; clearing this site&apos;s data in your browser does.
          </p>
        </Card>
      </Section>

      <Section title="How long we keep it">
        <Card>
          <List>
            <li>
              A household with no activity for 30 days is deleted automatically; the cleanup runs every hour. A household with an active
              Annual plan is kept until the plan ends.
            </li>
            <li>Activity log entries older than 30 days are deleted.</li>
            <li>
              You can delete a single document from <Link href="/report" className="font-medium text-brand-700 underline underline-offset-2">My report</Link>.
            </li>
            <li>
              <strong className="text-slate-900">Delete my data</strong> (on My report or Account) immediately removes your household,
              jobs, documents, checklist and its activity log, and clears the cookie. What remains is one log line saying that a household
              was deleted, with no household ID.
            </li>
          </List>
        </Card>
      </Section>

      <Section title="Your private link">
        <Card>
          <p className="text-sm text-slate-700">
            Your private link (<code className="rounded bg-slate-100 px-1 font-mono text-xs">/recover#…</code>) contains your household
            secret and opens your data on another device. <strong className="text-slate-900">Anyone with the link can open and change your
            data</strong>, so keep it like a password. The secret sits after the #, which browsers don&apos;t send when loading the page; the
            page sends it to our server once to restore your cookie. We can&apos;t recover your data if you lose both the cookie and the link,
            because we don&apos;t have your secret. After Delete my data, the link stops working.
          </p>
        </Card>
      </Section>

      <Section title="Who can access your data">
        <Card>
          <p className="text-sm text-slate-700">
            Only the PayTrail server process, while it handles a request from your browser. No one on the team reviews your documents or
            fields, and there is no admin screen for household data. The team holds the hosting account and the server key, which alone
            can&apos;t decrypt your data; see the limits above.
          </p>
        </Card>
      </Section>

      <Section title="Contact and changes">
        <Card>
          <p className="text-sm text-slate-700">
            Questions or a problem? Contact the team through the <Ext href={REPO}>GitHub repository</Ext>. If what the code does changes,
            we update this page and the date at the top. See also <Link href="/accuracy" className="font-medium text-brand-700 underline underline-offset-2">Accuracy</Link> and{" "}
            <Link href="/about" className="font-medium text-brand-700 underline underline-offset-2">About</Link>.
          </p>
        </Card>
      </Section>
    </div>
  );
}
