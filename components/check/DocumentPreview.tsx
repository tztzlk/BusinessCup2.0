"use client";

import { useEffect, useState } from "react";

// Shows the file the user just picked, straight from browser memory (an object URL), so they can
// compare it with the fields we read. Nothing is uploaded or stored for this; the URL is revoked
// when the preview goes away.

export function DocumentPreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const isPdf = file.type === "application/pdf";
  const openLink = url && (
    <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">
      Open full size
    </a>
  );

  return (
    <figure className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <span className="min-w-0">
          <span className="font-medium text-slate-800">Your document</span> · shown from this browser only, not stored
        </span>
        {openLink}
      </figcaption>
      <div className="min-h-0 flex-1">
        {url &&
          (isPdf ? (
            <object data={url} type="application/pdf" aria-label="Your uploaded document" className="h-full w-full">
              {/* Browsers that can't show a PDF inline (e.g. Chrome on Android) get a link instead. */}
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-600">
                <p>
                  This browser can&apos;t show the PDF here. {openLink} to compare it with the fields.
                </p>
              </div>
            </object>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimizable asset
            <img src={url} alt="Your uploaded document" className="h-full w-full object-contain" />
          ))}
      </div>
    </figure>
  );
}
