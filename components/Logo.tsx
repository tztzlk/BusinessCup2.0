"use client";

import { useEffect, useRef } from "react";

// PayTrail mark: the bowl of a "P", then a blue dot that climbs the stem and leaves the trail behind it.
// Animated with SMIL so the dot follows the exact path; the stroke uses currentColor (white on navy,
// navy on white). A static copy is shown instead for users who prefer reduced motion (globals.css).

const BOWL = "M 30 24 H 128 C 187 24 187 120 128 120 H 85";
const STEM = "M 26 163 V 119 C 26 88 48 77 76 77 H 123";
const EASE = "0.65 0 0.35 1";

export function LogoMark({
  size = 32,
  animate = false,
  breathe = false,
  className = "",
}: {
  size?: number;
  animate?: boolean;
  /** Keep a soft pulse on the dot after the entrance (hero only). */
  breathe?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);

  // SMIL timelines start at document load; restart them when the mark mounts later (client navigation).
  useEffect(() => {
    if (animate) ref.current?.setCurrentTime?.(0);
  }, [animate]);

  const common = { viewBox: "0 0 200 190", width: size, height: (size * 190) / 200, fill: "none", "aria-hidden": true } as const;
  const stroke = { stroke: "currentColor", strokeWidth: 32, strokeLinecap: "round", strokeLinejoin: "round" } as const;

  if (!animate) {
    return (
      <svg {...common} className={className}>
        <path d={`${BOWL} ${STEM}`} {...stroke} />
        <circle cx={123} cy={77} r={18} fill="#5B7CFA" />
      </svg>
    );
  }

  return (
    <>
      <svg {...common} className={`logo-static ${className}`}>
        <path d={`${BOWL} ${STEM}`} {...stroke} />
        <circle cx={123} cy={77} r={18} fill="#5B7CFA" />
      </svg>
      <svg ref={ref} {...common} className={`logo-motion ${className}`}>
        {/* 1. The bowl of the P draws itself. */}
        <path d={BOWL} pathLength={1} strokeDasharray="1" strokeDashoffset="1" {...stroke}>
          <animate attributeName="stroke-dashoffset" from="1" to="0" begin="0.15s" dur="0.7s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines={EASE} />
        </path>
        {/* 2. The stem is drawn behind the climbing dot. */}
        <path d={STEM} pathLength={1} strokeDasharray="1" strokeDashoffset="1" {...stroke}>
          <animate attributeName="stroke-dashoffset" from="1" to="0" begin="0.7s" dur="0.85s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines={EASE} />
        </path>
        {/* 3. Landing ripples. */}
        {[0, 0.18].map((delay) => (
          <circle key={delay} cx={123} cy={77} r={18} stroke="#5B7CFA" strokeWidth={6} fill="none" opacity={0}>
            <animate attributeName="r" from="18" to="70" begin={`${1.55 + delay}s`} dur="0.9s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.6 0.35 1" />
            <animate attributeName="opacity" values="0.7;0" begin={`${1.55 + delay}s`} dur="0.9s" fill="freeze" />
          </circle>
        ))}
        {breathe && (
          <circle cx={123} cy={77} r={18} fill="#5B7CFA" opacity={0}>
            <animate attributeName="r" values="18;40" begin="3s" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0" begin="3s" dur="2.6s" repeatCount="indefinite" />
          </circle>
        )}
        {/* The dot rides the stem and lands where the trail ends. */}
        <circle r={18} fill="#5B7CFA" opacity={0}>
          <set attributeName="opacity" to="1" begin="0.7s" fill="freeze" />
          <animateMotion path={STEM} begin="0.7s" dur="0.85s" fill="freeze" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines={EASE} />
          <animate attributeName="r" values="18;23;17;18" keyTimes="0;0.35;0.7;1" begin="1.55s" dur="0.45s" fill="freeze" />
        </circle>
      </svg>
    </>
  );
}

const WORD = ["P", "a", "y", "T", "r", "a", "i", "l"];

export function Logo({ size = 28, animate = false }: { size?: number; animate?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="PayTrail">
      <LogoMark size={size} animate={animate} />
      <span className="text-lg font-semibold tracking-tight" aria-hidden="true">
        {WORD.map((ch, i) => (
          <span
            key={i}
            className={`${animate ? "logo-letter" : ""} inline-block ${i >= 3 ? "text-brand-300" : ""}`}
            style={animate ? { animationDelay: `${1.2 + i * 0.05}s` } : undefined}
          >
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}
