# PayTrail

Paycheck checkups and tax-season prep for working US households.

PayTrail reads your pay stubs, checks withholding, overtime and your 401(k) match, projects whether your household will owe or get a refund in April, and tells you exactly what to change on your W-4. In January it builds your tax-document checklist, reconciles your W-2 with your pay stubs, and packages everything for your accountant.

Built in 24 hours at Business Cup 2.0 by team ENUshniki.

> Estimates only. Not tax advice. Not affiliated with the IRS.

## How it works

- **Claude reads, code calculates.** Claude (Anthropic API) only extracts fields from a pay stub or W-2 and writes plain-English explanations. Every number is computed by a deterministic, tested engine with tax parameters versioned by year and linked to IRS sources.
- **You confirm every field** before anything is saved.
- **Documents are never stored by us.** Files live in memory while Claude reads them through Anthropic's commercial API; only the fields you confirm are kept. SSN, addresses and account numbers are not extracted.
- **Encrypted at the field level.** Each household's data is encrypted with AES-256-GCM using a key derived from a secret that only your browser holds (httpOnly cookie) plus a server key. A copy of the database alone is unreadable.
- **Delete anytime.** One click removes everything; inactive households are purged after 30 days.

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
fly secrets set ANTHROPIC_API_KEY=... MASTER_KEY=...
fly deploy
```

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Case and judging criteria](docs/CASE.md)
- [Research log: idea selection, competitors, market](docs/RESEARCH-LOG.md)
- [Team tasks](docs/TASKS.md)
