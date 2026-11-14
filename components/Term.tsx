"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY, type GlossaryKey, splitTerms } from "@/lib/glossary";

// A tax term with a plain-English explanation. Opens on hover (mouse), on keyboard focus and on tap
// (tap again or tap elsewhere to close); Escape closes. The text is also linked by aria-describedby.

const WIDTH = 280;
const GAP = 6;
const noop = () => () => {};

/** False during server render and hydration, true after: the portal needs document.body. */
function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function Term({ k, children }: { k: GlossaryKey; children?: ReactNode }) {
  const entry = GLOSSARY[k];
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  // Touch: remember whether it was open before this tap, so the tap toggles it.
  const tap = useRef<{ touch: boolean; wasPinned: boolean }>({ touch: false, wasPinned: false });
  const open = hover || pinned;
  const mounted = useMounted();

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const width = Math.min(WIDTH, vw - 16);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), vw - width - 8);
    setPos({ top: r.bottom + GAP, left, width });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setHover(false);
      setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-describedby={id}
        aria-expanded={open}
        className="cursor-help rounded-sm text-inherit underline decoration-slate-400 decoration-dotted underline-offset-[3px] hover:decoration-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
        onPointerDown={(e) => {
          tap.current = { touch: e.pointerType !== "mouse", wasPinned: pinned };
        }}
        onFocus={() => setPinned(true)}
        onBlur={() => setPinned(false)}
        onClick={() => {
          if (tap.current.touch) setPinned(!tap.current.wasPinned);
          else if (!hover) setPinned((v) => !v); // keyboard Enter / Space
          tap.current = { touch: false, wasPinned: false };
        }}
      >
        {children ?? entry.term}
      </button>
      {/* Always in the DOM (hidden when closed) so aria-describedby resolves; portaled to escape transformed parents. */}
      {mounted &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            hidden={!open || !pos}
            style={pos ? { position: "fixed", top: pos.top, left: pos.left, width: pos.width } : undefined}
            className="z-50 rounded-lg bg-ink px-3 py-2 text-left text-xs font-normal leading-relaxed text-white shadow-lg"
          >
            <span className="block font-semibold">{entry.term}</span>
            {entry.definition}
          </span>,
          document.body,
        )}
    </>
  );
}

/** Plain text with the first occurrence of each listed term wrapped in a Term. */
export function TermText({ text, terms }: { text: string; terms: readonly GlossaryKey[] }) {
  return (
    <>
      {splitTerms(text, terms).map((part, i) =>
        part.term ? (
          <Term key={i} k={part.term}>
            {part.text}
          </Term>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
