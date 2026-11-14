# PayTrail

Paycheck checkups and tax-season prep for working US households.

PayTrail reads your pay stubs, checks withholding, overtime and your 401(k) match, projects whether your household will owe or get a refund in April, and tells you exactly what to change on your W-4. In January it builds your tax-document checklist, reconciles your W-2 with your pay stubs, and packages everything for your accountant.

Built in 24 hours at Business Cup 2.0 by team ENUshniki.

**Live:** https://paytrail-enushniki.fly.dev — no sign-up. Try a sample household under *Sample households*, or *Check my pay stub* → *Try with a sample pay stub*. Annual ($99/year) runs on Stripe test mode: card `4242 4242 4242 4242`, any future date and CVC.

> Estimates only. Not tax advice. Not affiliated with the IRS.

## How it works

- **Claude reads, code calculates.** Claude (Anthropic API) only extracts fields from a pay stub or W-2 and writes plain-English explanations. Every number is computed by a deterministic, tested engine with tax parameters versioned by year and linked to IRS sources.
- **You confirm every field** before anything is saved.
- **Documents are never stored by us.** Files live in memory while Claude reads them through Anthropic's commercial API; only the fields you confirm are kept. SSN, addresses and account numbers are not extracted.
- **Encrypted at the field level.** Each household's data is encrypted with AES-256-GCM using a key rebuilt for every request from a secret kept in your browser (httpOnly cookie) and a server key; the key is never stored. A copy of the database alone is unreadable.
- **Delete anytime.** One click removes the household, jobs, documents, checklist and activity log; inactive households are purged after 30 days.

## How we verified it

| What | Result | Details |
|---|---|---|
| Per-paycheck withholding vs IRS Pub. 15-T (2026) | All 4,350 wage-bracket amounts, all annual percentage-method values and 20 Worksheet 1A cases match | [docs/ENGINE-CROSSCHECK.md](docs/ENGINE-CROSSCHECK.md) |
| Annual federal tax vs two open-source tax models (PolicyEngine-US, Tax-Calculator) | Within $0.01 on 11 households, incl. the 2026 overtime deduction and the $2,200 Child Tax Credit | [docs/ENGINE-CROSSCHECK.md](docs/ENGINE-CROSSCHECK.md) |
| Document reading (Claude) on synthetic pay stubs and W-2s | 209 of 209 fields exact on 11 files (our own layouts, small sample) | [docs/EVAL-EXTRACT.md](docs/EVAL-EXTRACT.md) |
| Automated tests | `npm test` (Vitest), run in CI before every deploy | `tests/` |

**Not supported yet:** state income tax, EITC, itemized deductions, self-employment (1099) tax, other income in the April projection, a job that ended mid-year (the projection assumes each job pays through December). Full list: the in-app [Accuracy](https://paytrail-enushniki.fly.dev/accuracy) page.

## Stack

Next.js 15 (TypeScript, Node.js) · SQLite (better-sqlite3) · Claude API · Docker · Fly.io

## Run locally

```bash
cp .env.example .env          # set ANTHROPIC_API_KEY and MASTER_KEY (openssl rand -base64 32)
npm install
npm run dev                   # http://localhost:3000
npm test                      # unit tests
```

Or with Docker: `docker compose up --build`.

## Deploy

```bash
fly launch --no-deploy        # first time only, uses fly.toml
fly volumes create paytrail_data --size 1 --region fra
fly secrets set ANTHROPIC_API_KEY=... MASTER_KEY=... STRIPE_SECRET_KEY=sk_test_... CLAUDE_HOURLY_CAP=100
fly deploy                    # afterwards every push to main deploys via GitHub Actions
```

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Case and judging criteria](docs/CASE.md)
- [Research log: idea selection, competitors, market](docs/RESEARCH-LOG.md)
- [Team tasks](docs/TASKS.md)
- [Engine cross-check](docs/ENGINE-CROSSCHECK.md) · [Extraction eval](docs/EVAL-EXTRACT.md)
- [Unit economics at $99](docs/research/unit-economics-99.md) ([Excel model](docs/research/unit-economics-99.xlsx)) · [CAC evidence](docs/research/cac-evidence.md) · [Problem and user evidence](docs/research/18-00-numbers.md)
- In the app: [Privacy](https://paytrail-enushniki.fly.dev/privacy) · [Accuracy](https://paytrail-enushniki.fly.dev/accuracy) · [About](https://paytrail-enushniki.fly.dev/about)
