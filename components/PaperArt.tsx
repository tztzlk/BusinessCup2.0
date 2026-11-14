// Fictional US payroll paper drawn in SVG: an earnings statement, a paycheck and a W-2.
// Decoration only (aria-hidden). Every name says SAMPLE; the pay stub matches public/samples/sample-paystub.pdf.

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

type ArtProps = { className?: string; style?: React.CSSProperties };

const STUB_ROWS: Array<[string, string, string, string]> = [
  ["Regular", "80.00", "20.00", "1,600.00"],
  ["Overtime", "10.00", "20.00", "200.00"],
];
const STUB_TAXES: Array<[string, string]> = [
  ["Federal income tax", "125.31"],
  ["Social Security", "111.60"],
  ["Medicare", "26.10"],
  ["401(k) pre-tax", "54.00"],
];

/** Earnings statement. `scan` adds the scanner sweep and the flagged overtime row. */
export function PayStubArt({ className, style, scan = false }: ArtProps & { scan?: boolean }) {
  return (
    <svg viewBox="0 0 320 400" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="scanbeam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5B7CFA" stopOpacity="0" />
          <stop offset="0.85" stopColor="#5B7CFA" stopOpacity="0.28" />
          <stop offset="1" stopColor="#5B7CFA" stopOpacity="0.9" />
        </linearGradient>
        <clipPath id="stubclip">
          <rect width="320" height="400" rx="14" />
        </clipPath>
      </defs>
      <rect width="320" height="400" rx="14" fill="#ffffff" />
      <rect width="320" height="54" rx="14" fill="#eef2ff" />
      <rect y="40" width="320" height="14" fill="#eef2ff" />
      <text x="20" y="24" fontFamily={SANS} fontSize="11" fontWeight="700" fill="#0b1024">ACME LOGISTICS LLC</text>
      <text x="20" y="40" fontFamily={SANS} fontSize="8.5" fill="#64748b">SAMPLE · Fictional data · Dallas, TX</text>
      <text x="300" y="24" textAnchor="end" fontFamily={SANS} fontSize="9" fontWeight="700" fill="#374dc9">EARNINGS STATEMENT</text>
      <text x="300" y="40" textAnchor="end" fontFamily={MONO} fontSize="8.5" fill="#64748b">Pay date 11/06/2026</text>

      <text x="20" y="78" fontFamily={SANS} fontSize="8" fontWeight="700" fill="#64748b">EARNINGS</text>
      <text x="168" y="78" textAnchor="end" fontFamily={SANS} fontSize="8" fill="#94a3b8">HOURS</text>
      <text x="226" y="78" textAnchor="end" fontFamily={SANS} fontSize="8" fill="#94a3b8">RATE</text>
      <text x="300" y="78" textAnchor="end" fontFamily={SANS} fontSize="8" fill="#94a3b8">THIS PERIOD</text>
      <line x1="20" x2="300" y1="85" y2="85" stroke="#e2e8f0" />
      {STUB_ROWS.map(([label, hours, rate, amount], i) => (
        <g key={label} fontFamily={MONO} fontSize="10" fill="#0f172a">
          <text x="20" y={104 + i * 22} fontFamily={SANS}>{label}</text>
          <text x="168" y={104 + i * 22} textAnchor="end">{hours}</text>
          <text x="226" y={104 + i * 22} textAnchor="end">{rate}</text>
          <text x="300" y={104 + i * 22} textAnchor="end">{amount}</text>
        </g>
      ))}

      <text x="20" y="164" fontFamily={SANS} fontSize="8" fontWeight="700" fill="#64748b">TAXES &amp; DEDUCTIONS</text>
      <line x1="20" x2="300" y1="171" y2="171" stroke="#e2e8f0" />
      {STUB_TAXES.map(([label, amount], i) => (
        <g key={label} fontSize="10" fill="#0f172a">
          <text x="20" y={190 + i * 21} fontFamily={SANS}>{label}</text>
          <text x="300" y={190 + i * 21} textAnchor="end" fontFamily={MONO}>{amount}</text>
        </g>
      ))}

      <rect x="20" y="284" width="280" height="40" rx="8" fill="#f1f4ff" />
      <text x="34" y="309" fontFamily={SANS} fontSize="10" fontWeight="700" fill="#0b1024">NET PAY</text>
      <text x="286" y="309" textAnchor="end" fontFamily={MONO} fontSize="13" fontWeight="700" fill="#0b1024">$1,482.99</text>
      <text x="20" y="350" fontFamily={SANS} fontSize="8" fill="#94a3b8">YTD gross 38,200.00 · Biweekly · Period 10/19–11/01</text>
      <g fill="#e2e8f0">
        <rect x="20" y="366" width="120" height="6" rx="3" />
        <rect x="150" y="366" width="60" height="6" rx="3" />
      </g>

      {scan && (
        <g clipPath="url(#stubclip)">
          {/* Flagged overtime row: 10 h paid at $20 instead of $30. */}
          <g className="stub-flag">
            <rect x="12" y="110" width="296" height="24" rx="6" fill="#fff1f2" stroke="#f43f5e" strokeWidth="1.5" />
            <text x="20" y="126" fontFamily={SANS} fontSize="10" fill="#9f1239">Overtime</text>
            <text x="168" y="126" textAnchor="end" fontFamily={MONO} fontSize="10" fill="#9f1239">10.00</text>
            <text x="226" y="126" textAnchor="end" fontFamily={MONO} fontSize="10" fontWeight="700" fill="#e11d48">20.00</text>
            <text x="300" y="126" textAnchor="end" fontFamily={MONO} fontSize="10" fill="#9f1239">200.00</text>
          </g>
          <rect className="stub-scan" x="0" y="-60" width="320" height="60" fill="url(#scanbeam)" />
        </g>
      )}
    </svg>
  );
}

/** A paycheck with a VOID/SAMPLE stamp. */
export function CheckArt({ className, style }: ArtProps) {
  return (
    <svg viewBox="0 0 460 200" className={className} style={style} aria-hidden="true">
      <rect width="460" height="200" rx="12" fill="#f8fafc" />
      <rect x="8" y="8" width="444" height="184" rx="8" fill="none" stroke="#c9d4fe" strokeDasharray="4 4" />
      <text x="24" y="38" fontFamily={SANS} fontSize="12" fontWeight="700" fill="#0b1024">NORTHWIND LOGISTICS</text>
      <text x="24" y="54" fontFamily={SANS} fontSize="9" fill="#64748b">SAMPLE · Payroll account</text>
      <text x="436" y="38" textAnchor="end" fontFamily={MONO} fontSize="11" fill="#0b1024">No. 004127</text>
      <text x="436" y="58" textAnchor="end" fontFamily={MONO} fontSize="10" fill="#64748b">DATE 10/31/2026</text>
      <text x="24" y="92" fontFamily={SANS} fontSize="9" fill="#64748b">PAY TO THE ORDER OF</text>
      <text x="150" y="92" fontFamily={SANS} fontSize="13" fontStyle="italic" fill="#0b1024">Alex Sample</text>
      <line x1="146" x2="330" y1="96" y2="96" stroke="#94a3b8" />
      <rect x="344" y="76" width="92" height="26" rx="4" fill="#ffffff" stroke="#94a3b8" />
      <text x="430" y="94" textAnchor="end" fontFamily={MONO} fontSize="12" fontWeight="700" fill="#0b1024">$2,930.99</text>
      <text x="24" y="124" fontFamily={SANS} fontSize="10" fontStyle="italic" fill="#334155">Two thousand nine hundred thirty and 99/100</text>
      <text x="436" y="124" textAnchor="end" fontFamily={SANS} fontSize="9" fill="#64748b">DOLLARS</text>
      <line x1="24" x2="436" y1="128" y2="128" stroke="#cbd5e1" />
      <line x1="290" x2="436" y1="160" y2="160" stroke="#94a3b8" />
      <text x="290" y="172" fontFamily={SANS} fontSize="8" fill="#94a3b8">AUTHORIZED SIGNATURE</text>
      <text x="24" y="182" fontFamily={MONO} fontSize="12" letterSpacing="2" fill="#475569">⑆000000000⑆ 0000000000⑈ 4127</text>
      <g transform="rotate(-12 200 150)">
        <rect x="120" y="128" width="160" height="40" rx="6" fill="none" stroke="#e11d48" strokeWidth="3" opacity="0.55" />
        <text x="200" y="156" textAnchor="middle" fontFamily={SANS} fontSize="20" fontWeight="800" fill="#e11d48" opacity="0.55">VOID · SAMPLE</text>
      </g>
    </svg>
  );
}

/** Form W-2 with box 12 D flagged, as in the January demo. */
export function W2Art({ className, style }: ArtProps) {
  const box = (x: number, y: number, w: number, label: string, value: string, flag = false) => (
    <g key={label}>
      <rect x={x} y={y} width={w} height="38" fill={flag ? "#fff1f2" : "#ffffff"} stroke={flag ? "#f43f5e" : "#cbd5e1"} strokeWidth={flag ? 1.5 : 1} />
      <text x={x + 6} y={y + 12} fontFamily={SANS} fontSize="7" fill="#64748b">{label}</text>
      <text x={x + w - 6} y={y + 30} textAnchor="end" fontFamily={MONO} fontSize="11" fill={flag ? "#be123c" : "#0f172a"}>{value}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 360 230" className={className} style={style} aria-hidden="true">
      <rect width="360" height="230" rx="10" fill="#ffffff" />
      <text x="16" y="26" fontFamily={SANS} fontSize="16" fontWeight="800" fill="#0b1024">W-2</text>
      <text x="58" y="20" fontFamily={SANS} fontSize="8" fontWeight="700" fill="#0b1024">Wage and Tax Statement</text>
      <text x="58" y="31" fontFamily={SANS} fontSize="7.5" fill="#64748b">2026 · SAMPLE · Bluebonnet Health</text>
      {box(16, 44, 164, "1 Wages, tips, other comp.", "78,000.00")}
      {box(180, 44, 164, "2 Federal income tax withheld", "5,000.06")}
      {box(16, 82, 164, "3 Social security wages", "78,000.00")}
      {box(180, 82, 164, "4 Social security tax withheld", "4,836.00")}
      {box(16, 120, 164, "5 Medicare wages and tips", "78,000.00")}
      {box(180, 120, 164, "12a  D", "1,560.00", true)}
      <text x="344" y="178" textAnchor="end" fontFamily={SANS} fontSize="8" fontWeight="700" fill="#e11d48">Pay stubs show $0.00</text>
      <rect x="16" y="194" width="200" height="6" rx="3" fill="#e2e8f0" />
      <rect x="16" y="208" width="140" height="6" rx="3" fill="#e2e8f0" />
    </svg>
  );
}
