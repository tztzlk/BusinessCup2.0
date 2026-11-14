#!/usr/bin/env node
// Renders the ground-truth documents (fictional, labeled SAMPLE) into PDFs and a few PNGs
// for the /api/extract accuracy eval. Usage: node scripts/eval-extract/render.mjs
//
// Inputs:  fixtures/truth-raw.json (pay stubs from mocks/*.json and the two W-2s built by lib/demo.ts)
// Outputs: fixtures/html/*.html, fixtures/*.pdf, fixtures/*.png, fixtures/truth.json
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");
const htmlDir = join(fixtures, "html");
mkdirSync(htmlDir, { recursive: true });

const CHROME = process.env.CHROME ?? "/usr/bin/google-chrome";

// Fictional employee names per source document. No SSNs, addresses or account numbers are printed.
const EMPLOYEE = {
  couple_doc_alex_1031: "Alex Sample",
  couple_doc_jordan_1031: "Jordan Sample",
  hourly_doc_rosa_1106: "Rosa Sample",
  hourly_doc_tom_1106: "Tom Sample",
  salaried_doc_nina_1031: "Nina Sample",
  salaried_doc_marcus_1031: "Marcus Sample",
  couple_doc_alex_1031_w2: "Alex Sample",
  couple_doc_jordan_1031_w2: "Jordan Sample",
};

// Which documents also get a PNG "screenshot" variant.
const PNG_VARIANTS = ["hourly_doc_rosa_1106", "couple_doc_alex_1031_w2"];

const money = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyPlain = (n) => n.toFixed(2); // W-2 style: no thousands separators
const usDate = (iso) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
const sum = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

const EARNING_LABEL = { regular: "Regular", overtime: "Overtime", bonus: "Bonus", pto: "PTO", holiday: "Holiday", other: "Other" };
const TAX_LABEL = {
  federal_income: "Federal Income Tax",
  social_security: "Social Security (OASDI)",
  medicare: "Medicare",
  state_income: "State Income Tax",
  local: "Local Tax",
  other: "Other Tax",
};
const DED_LABEL = {
  "401k_pretax": "401(k) Pre-Tax",
  "401k_roth": "Roth 401(k)",
  health: "Medical",
  dental: "Dental",
  vision: "Vision",
  hsa: "HSA",
  fsa: "FSA",
  other: "Other",
};
const ER_LABEL = { "401k_match": "401(k) Employer Match", hsa: "Employer HSA", other: "Other" };
const FREQ_LABEL = { weekly: "Weekly", biweekly: "Bi-Weekly", semimonthly: "Semi-Monthly", monthly: "Monthly" };

const BASE_CSS = `
  @page { size: Letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: "DejaVu Sans", Arial, Helvetica, sans-serif; color: #111; font-size: 10.5pt; }
  .page { position: relative; width: 7.5in; min-height: 9.8in; }
  .wm { position: fixed; top: 42%; left: -0.4in; width: 8.3in; text-align: center; transform: rotate(-35deg);
        font-size: 54pt; font-weight: 700; color: rgba(200, 0, 0, 0.13); z-index: 0; pointer-events: none; white-space: nowrap; }
  .content { position: relative; z-index: 1; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 3px 6px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .muted { color: #555; }
  .note { font-size: 8pt; color: #666; margin-top: 14px; }
  @media screen { body { padding: 0.5in; } .wm { left: 0.1in; } }
`;

const watermark = `<div class="wm">SAMPLE — fictional data</div>`;

function doc(title, css, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>${BASE_CSS}${css}</style></head><body><div class="page">${watermark}<div class="content">${body}</div></div></body></html>`;
}

function stubTotals(s) {
  const taxesCur = sum(s.taxes.map((t) => t.current));
  const taxesYtd = sum(s.taxes.map((t) => t.ytd ?? 0));
  const dedCur = sum(s.deductions.map((d) => d.current));
  const dedYtd = sum(s.deductions.map((d) => d.ytd ?? 0));
  const netYtd = Math.round(((s.grossYtd ?? 0) - taxesYtd - dedYtd) * 100) / 100;
  return { taxesCur, taxesYtd, dedCur, dedYtd, netYtd };
}

const rateCell = (r) => (r == null ? "" : money(r));
const hoursCell = (h) => (h == null ? "" : h.toFixed(2));

// Style A: stacked sections, classic payroll-provider look.
function stubA(id, s) {
  const t = stubTotals(s);
  const pre = s.deductions.filter((d) => d.preTax);
  const post = s.deductions.filter((d) => !d.preTax);
  const dedRows = (rows) =>
    rows.map((d) => `<tr><td>${DED_LABEL[d.type]}</td><td class="num">${money(d.current)}</td><td class="num">${money(d.ytd)}</td></tr>`).join("");
  const section = (title, head, rows) =>
    rows ? `<table class="sec"><thead><tr><th class="l">${title}</th>${head}</tr></thead><tbody>${rows}</tbody></table>` : "";
  const curYtd = `<th class="num">Current</th><th class="num">Year to Date</th>`;
  const css = `
    .hdr { display: flex; justify-content: space-between; border-bottom: 2px solid #1f3a5f; padding-bottom: 8px; }
    .co { font-size: 16pt; font-weight: 700; color: #1f3a5f; }
    .title { font-size: 13pt; font-weight: 700; text-align: right; }
    .info { margin: 10px 0 14px; } .info td { padding: 2px 8px 2px 0; } .info .k { color: #555; }
    .sec { margin-bottom: 12px; } .sec thead th { background: #e8eef5; border-bottom: 1px solid #9fb3c8; font-size: 9.5pt; }
    .sec th.l { text-align: left; } .sec tbody tr td { border-bottom: 1px solid #eee; }
    .tot td { font-weight: 700; border-top: 1px solid #333; }
    .summary { margin-top: 6px; border: 1.5px solid #1f3a5f; } .summary th { background: #1f3a5f; color: #fff; font-size: 9.5pt; }
    .summary td { font-weight: 600; } .net { font-size: 12pt; }
  `;
  const body = `
    <div class="hdr"><div><div class="co">${s.employerName}</div><div class="muted">Payroll services by SamplePay (fictional)</div></div>
      <div class="title">EARNINGS STATEMENT<br><span class="muted" style="font-size:9pt;font-weight:400">Advice No. SAMPLE-${id.length}${s.payDate.replace(/-/g, "")}</span></div></div>
    <table class="info"><tr><td class="k">Employee</td><td>${EMPLOYEE[id]} (fictional)</td><td class="k">Pay Period</td><td>${usDate(s.payPeriodStart)} – ${usDate(s.payPeriodEnd)}</td></tr>
      <tr><td class="k">Employee ID</td><td>E-00${id.length}</td><td class="k">Pay Date</td><td>${usDate(s.payDate)}</td></tr>
      <tr><td class="k">Department</td><td>General</td><td class="k">Pay Frequency</td><td>${FREQ_LABEL[s.payFrequency]}</td></tr></table>
    ${section(
      "Earnings",
      `<th class="num">Hours</th><th class="num">Rate</th>${curYtd}`,
      s.earnings
        .map((e) => `<tr><td>${EARNING_LABEL[e.type]}</td><td class="num">${hoursCell(e.hours)}</td><td class="num">${rateCell(e.rate)}</td><td class="num">${money(e.current)}</td><td class="num">${money(e.ytd)}</td></tr>`)
        .join("") +
        `<tr class="tot"><td>Gross Pay</td><td></td><td></td><td class="num">${money(s.grossCurrent)}</td><td class="num">${money(s.grossYtd)}</td></tr>`,
    )}
    ${section(
      "Taxes Withheld",
      curYtd,
      s.taxes.map((x) => `<tr><td>${TAX_LABEL[x.type]}</td><td class="num">${money(x.current)}</td><td class="num">${money(x.ytd)}</td></tr>`).join("") +
        `<tr class="tot"><td>Total Taxes</td><td class="num">${money(t.taxesCur)}</td><td class="num">${money(t.taxesYtd)}</td></tr>`,
    )}
    ${pre.length ? section("Pre-Tax Deductions", curYtd, dedRows(pre)) : ""}
    ${post.length ? section("Post-Tax Deductions", curYtd, dedRows(post)) : ""}
    ${
      s.employerContributions.length
        ? section(
            "Employer Contributions (not included in pay)",
            curYtd,
            s.employerContributions.map((x) => `<tr><td>${ER_LABEL[x.type]}</td><td class="num">${money(x.current)}</td><td class="num">${money(x.ytd)}</td></tr>`).join(""),
          )
        : ""
    }
    <table class="summary"><thead><tr><th></th><th class="num">Gross Pay</th><th class="num">Taxes</th><th class="num">Deductions</th><th class="num">Net Pay</th></tr></thead>
      <tbody><tr><td>Current</td><td class="num">${money(s.grossCurrent)}</td><td class="num">${money(t.taxesCur)}</td><td class="num">${money(t.dedCur)}</td><td class="num net">${money(s.netCurrent)}</td></tr>
      <tr><td>Year to Date</td><td class="num">${money(s.grossYtd)}</td><td class="num">${money(t.taxesYtd)}</td><td class="num">${money(t.dedYtd)}</td><td class="num">${money(t.netYtd)}</td></tr></tbody></table>
    <div class="note">SAMPLE — fictional data generated for software testing. Not a real pay statement. Non-negotiable.</div>`;
  return doc(`Earnings statement ${id}`, css, body);
}

// Style B: summary bar on top, earnings left, taxes and deductions right.
function stubB(id, s) {
  const t = stubTotals(s);
  const css = `
    .top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; }
    .co { font-size: 15pt; font-weight: 700; } .doc { font-size: 11pt; letter-spacing: 1px; color: #2d6a4f; font-weight: 700; }
    .meta { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #b7c9bd; margin-bottom: 10px; }
    .meta div { padding: 5px 8px; border-right: 1px solid #b7c9bd; } .meta div:last-child { border-right: 0; }
    .meta .k { font-size: 8pt; color: #555; text-transform: uppercase; display: block; }
    .bar { display: grid; grid-template-columns: repeat(4, 1fr); background: #edf6f0; border: 1px solid #b7c9bd; margin-bottom: 12px; }
    .bar div { padding: 6px 8px; text-align: center; } .bar .k { font-size: 8pt; color: #555; display: block; text-transform: uppercase; }
    .bar .v { font-size: 12pt; font-weight: 700; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .box h3 { margin: 0 0 4px; font-size: 9.5pt; text-transform: uppercase; color: #2d6a4f; border-bottom: 1.5px solid #2d6a4f; padding-bottom: 2px; }
    .box { margin-bottom: 12px; } .box th { font-size: 8.5pt; color: #555; font-weight: 600; text-align: left; }
    .box th.num { text-align: right; } .box td { border-bottom: 1px dotted #ccc; font-size: 9.5pt; }
    .tot td { font-weight: 700; border-bottom: 0; border-top: 1px solid #333; }
  `;
  const head = (cols) => `<tr><th>Description</th>${cols.map((c) => `<th class="num">${c}</th>`).join("")}</tr>`;
  const deds = s.deductions
    .map((d) => `<tr><td>${DED_LABEL[d.type]}</td><td>${d.preTax ? "Pre-tax" : "After-tax"}</td><td class="num">${money(d.current)}</td><td class="num">${money(d.ytd)}</td></tr>`)
    .join("");
  const body = `
    <div class="top"><div><div class="co">${s.employerName}</div><div class="muted">Pay statement prepared by LedgerLine Payroll (fictional)</div></div><div class="doc">PAY STATEMENT</div></div>
    <div class="meta"><div><span class="k">Employee</span>${EMPLOYEE[id]} (fictional)</div><div><span class="k">Period Beginning</span>${usDate(s.payPeriodStart)}</div>
      <div><span class="k">Period Ending</span>${usDate(s.payPeriodEnd)}</div><div><span class="k">Check Date</span>${usDate(s.payDate)}</div></div>
    <div class="muted" style="margin:-4px 0 10px">Pay frequency: ${FREQ_LABEL[s.payFrequency]} &nbsp;·&nbsp; Employee no. 90${id.length}</div>
    <div class="bar"><div><span class="k">Gross Pay</span><span class="v">$${money(s.grossCurrent)}</span></div><div><span class="k">Taxes</span><span class="v">$${money(t.taxesCur)}</span></div>
      <div><span class="k">Deductions</span><span class="v">$${money(t.dedCur)}</span></div><div><span class="k">Net Pay</span><span class="v">$${money(s.netCurrent)}</span></div></div>
    <div class="cols"><div>
      <div class="box"><h3>Earnings</h3><table>${head(["Rate", "Hours", "This Period", "YTD"])}
        ${s.earnings.map((e) => `<tr><td>${EARNING_LABEL[e.type]}</td><td class="num">${rateCell(e.rate)}</td><td class="num">${hoursCell(e.hours)}</td><td class="num">${money(e.current)}</td><td class="num">${money(e.ytd)}</td></tr>`).join("")}
        <tr class="tot"><td>Gross</td><td></td><td></td><td class="num">${money(s.grossCurrent)}</td><td class="num">${money(s.grossYtd)}</td></tr></table></div>
      ${
        s.employerContributions.length
          ? `<div class="box"><h3>Employer-Paid Benefits</h3><table>${head(["This Period", "YTD"])}
        ${s.employerContributions.map((x) => `<tr><td>${ER_LABEL[x.type]}</td><td class="num">${money(x.current)}</td><td class="num">${money(x.ytd)}</td></tr>`).join("")}</table></div>`
          : ""
      }
    </div><div>
      <div class="box"><h3>Taxes</h3><table>${head(["This Period", "YTD"])}
        ${s.taxes.map((x) => `<tr><td>${TAX_LABEL[x.type]}</td><td class="num">${money(x.current)}</td><td class="num">${money(x.ytd)}</td></tr>`).join("")}
        <tr class="tot"><td>Total</td><td class="num">${money(t.taxesCur)}</td><td class="num">${money(t.taxesYtd)}</td></tr></table></div>
      ${
        s.deductions.length
          ? `<div class="box"><h3>Deductions</h3><table><tr><th>Description</th><th>Type</th><th class="num">This Period</th><th class="num">YTD</th></tr>${deds}
        <tr class="tot"><td>Total</td><td></td><td class="num">${money(t.dedCur)}</td><td class="num">${money(t.dedYtd)}</td></tr></table></div>`
          : ""
      }
      <div class="box"><h3>Net Pay</h3><table>${head(["This Period", "YTD"])}<tr class="tot"><td>Net Pay</td><td class="num">${money(s.netCurrent)}</td><td class="num">${money(t.netYtd)}</td></tr></table></div>
    </div></div>
    <div class="note">SAMPLE — fictional data generated for software testing. Not a real pay statement.</div>`;
  return doc(`Pay statement ${id}`, css, body);
}

// W-2 style: boxes labeled with numbers and names, our own layout (not the official form).
function w2(id, w) {
  const b12 = [0, 1, 2, 3].map((i) => w.box12[i] ?? null);
  const st = w.state[0] ?? null;
  const css = `
    .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
    .head .t { font-size: 15pt; font-weight: 700; } .head .y { font-size: 22pt; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1.15fr 1fr 1fr; border-left: 1px solid #000; border-top: 1px solid #000; }
    .b { border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 6px; min-height: 0.55in; }
    .b .lbl { font-size: 7.5pt; color: #333; display: block; } .b .lbl b { color: #000; margin-right: 3px; }
    .b .val { font-size: 11pt; font-family: "DejaVu Sans Mono", "Courier New", monospace; display: block; margin-top: 3px; text-align: right; }
    .b .val.l { text-align: left; } .span2 { grid-column: span 2; } .span3 { grid-column: span 3; }
    .chk { font-size: 8.5pt; display: flex; gap: 14px; margin-top: 4px; } .chk span { white-space: nowrap; }
    .box12 td { font-family: "DejaVu Sans Mono", monospace; font-size: 10.5pt; padding: 1px 4px; } .box12 .c { width: 0.5in; }
    .state { display: grid; grid-template-columns: 1fr 1.2fr 1.2fr 1.2fr; border-left: 1px solid #000; margin-top: 0; }
  `;
  const box = (num, label, value, cls = "", left = false) =>
    `<div class="b ${cls}"><span class="lbl"><b>${num}</b>${label}</span><span class="val${left ? " l" : ""}">${value}</span></div>`;
  const b12rows = b12
    .map((x, i) => `<tr><td class="c">12${"abcd"[i]}</td><td class="c">${x ? x.code : ""}</td><td class="num">${x ? moneyPlain(x.amount) : ""}</td></tr>`)
    .join("");
  const body = `
    <div class="head"><div><div class="t">Wage and Tax Statement (W-2) — Employee Copy</div>
      <div class="muted" style="font-size:8.5pt">Substitute layout for software testing. SAMPLE — fictional data.</div></div><div class="y">${w.taxYear}</div></div>
    <div class="grid">
      ${box("a", "Employee's social security number", "900-00-0000 (FAKE)", "", true)}
      ${box("1", "Wages, tips, other compensation", moneyPlain(w.box1Wages))}
      ${box("2", "Federal income tax withheld", moneyPlain(w.box2FederalWithheld))}
      ${box("b", "Employer identification number (EIN)", "00-0000000 (FAKE)", "", true)}
      ${box("3", "Social security wages", moneyPlain(w.box3SsWages))}
      ${box("4", "Social security tax withheld", moneyPlain(w.box4SsWithheld))}
      ${box("c", "Employer's name", w.employerName, "", true)}
      ${box("5", "Medicare wages and tips", moneyPlain(w.box5MedicareWages))}
      ${box("6", "Medicare tax withheld", moneyPlain(w.box6MedicareWithheld))}
      ${box("e", "Employee's name", `${EMPLOYEE[id]} (fictional)`, "", true)}
      ${box("7", "Social security tips", "")}
      ${box("8", "Allocated tips", "")}
      ${box("d", "Control number", "SAMPLE-0001", "", true)}
      ${box("10", "Dependent care benefits", "")}
      ${box("11", "Nonqualified plans", "")}
      <div class="b"><span class="lbl"><b>13</b></span>
        <div class="chk"><span>${"☐"} Statutory employee</span></div>
        <div class="chk"><span>${w.box13RetirementPlan ? "☒" : "☐"} Retirement plan</span></div>
        <div class="chk"><span>${"☐"} Third-party sick pay</span></div></div>
      <div class="b span2"><span class="lbl"><b>12</b>See instructions for box 12 (code / amount)</span>
        <table class="box12">${b12rows}</table></div>
      ${box("14", "Other", "", "span3", true)}
    </div>
    <div class="state">
      ${box("15", "State / Employer's state ID no.", st ? st.state : "", "", true)}
      ${box("16", "State wages, tips, etc.", st ? moneyPlain(st.box16Wages) : "")}
      ${box("17", "State income tax", st ? moneyPlain(st.box17Withheld) : "")}
      ${box("18–20", "Local wages / tax / locality", "")}
    </div>
    <div class="note">This substitute statement is SAMPLE data created for testing PayTrail. It is not an official IRS form and contains no real person's information.</div>`;
  return doc(`W-2 ${id}`, css, body);
}

function chrome(args) {
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--no-pdf-header-footer", ...args], { stdio: "ignore" });
}

function pdfPages(file) {
  const out = execFileSync("pdfinfo", [file]).toString();
  return Number(/Pages:\s+(\d+)/.exec(out)?.[1] ?? 0);
}

const raw = JSON.parse(readFileSync(join(fixtures, "truth-raw.json"), "utf8"));
const truth = [];
let style = 0;

for (const d of raw) {
  const html = d.docType === "w2" ? w2(d.id, d.fields) : style++ % 2 === 0 ? stubA(d.id, d.fields) : stubB(d.id, d.fields);
  const htmlPath = join(htmlDir, `${d.id}.html`);
  writeFileSync(htmlPath, html);
  const pdf = join(fixtures, `${d.id}.pdf`);
  chrome([`--print-to-pdf=${pdf}`, `file://${htmlPath}`]);
  truth.push({ id: d.id, file: `${d.id}.pdf`, mime: "application/pdf", docType: d.docType, layout: d.docType === "w2" ? "w2" : style % 2 === 1 ? "stub-A" : "stub-B", fields: d.fields });
  if (PNG_VARIANTS.includes(d.id)) {
    const png = join(fixtures, `${d.id}.png`);
    // Letter page at 816x1056 CSS px, scaled to 1200 px wide.
    chrome([`--screenshot=${png}`, "--window-size=816,1056", "--force-device-scale-factor=1.4706", `file://${htmlPath}`]);
    truth.push({ id: `${d.id}_png`, file: `${d.id}.png`, mime: "image/png", docType: d.docType, layout: truth.at(-1).layout + " (PNG)", fields: d.fields });
  }
}

// The existing public sample stub (different, independent layout). Ground truth read from its text layer
// (pdftotext -layout public/samples/sample-paystub.pdf), every field printed verbatim.
copyFileSync(join(here, "../../public/samples/sample-paystub.pdf"), join(fixtures, "acme_sample_paystub.pdf"));
truth.push({
  id: "acme_sample_paystub",
  file: "acme_sample_paystub.pdf",
  mime: "application/pdf",
  docType: "paystub",
  layout: "public sample (text-only)",
  fields: {
    employerName: "Acme Logistics LLC (SAMPLE)",
    payPeriodStart: "2026-10-19",
    payPeriodEnd: "2026-11-01",
    payDate: "2026-11-06",
    payFrequency: "biweekly",
    earnings: [
      { type: "regular", hours: 80, rate: 20, current: 1600, ytd: 35200 },
      { type: "overtime", hours: 10, rate: 20, current: 200, ytd: 3000 },
    ],
    taxes: [
      { type: "federal_income", current: 125.31, ytd: 2756.82 },
      { type: "social_security", current: 111.6, ytd: 2368.4 },
      { type: "medicare", current: 26.1, ytd: 553.9 },
    ],
    deductions: [{ type: "401k_pretax", preTax: true, current: 54, ytd: 1146 }],
    employerContributions: [{ type: "401k_match", current: 27, ytd: 573 }],
    grossCurrent: 1800,
    netCurrent: 1482.99,
    grossYtd: 38200,
  },
});

writeFileSync(join(fixtures, "truth.json"), JSON.stringify(truth, null, 2));

for (const t of truth) {
  const p = join(fixtures, t.file);
  const size = statSync(p).size;
  const pages = t.mime === "application/pdf" ? pdfPages(p) : "-";
  const limit = t.mime === "application/pdf" ? 10 * 1024 * 1024 : 7 * 1024 * 1024;
  const ok = size < limit && (pages === "-" || (pages >= 1 && pages <= 2));
  console.log(`${ok ? "OK " : "BAD"} ${t.id.padEnd(32)} ${t.mime.padEnd(16)} pages=${pages} size=${(size / 1024).toFixed(1)} KB`);
  if (!ok) process.exitCode = 1;
}
