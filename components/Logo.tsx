// PayTrail mark: a trail that turns into a "P", ending at a blue dot.
// The stroke uses currentColor, so the mark works on dark (white) and light (navy) backgrounds.
// `animate` draws the trail, then pops the dot; disabled for users who prefer reduced motion (globals.css).

export function LogoMark({ size = 32, animate = false, className = "" }: { size?: number; animate?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 190"
      width={size}
      height={(size * 190) / 200}
      fill="none"
      aria-hidden="true"
      className={`${animate ? "logo-animate" : ""} ${className}`}
    >
      <path
        className="logo-trail"
        pathLength={1}
        d="M 30 24 H 128 C 187 24 187 120 128 120 H 85 M 26 163 V 119 C 26 88 48 77 76 77 H 123"
        stroke="currentColor"
        strokeWidth={32}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="logo-dot" cx={123} cy={77} r={18} fill="#5B7CFA" />
    </svg>
  );
}

export function Logo({ size = 28, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${animate ? "logo-animate" : ""}`} aria-label="PayTrail">
      <LogoMark size={size} animate={animate} />
      <span className="logo-word text-lg font-semibold tracking-tight">
        Pay<span className="text-brand-300">Trail</span>
      </span>
    </span>
  );
}
