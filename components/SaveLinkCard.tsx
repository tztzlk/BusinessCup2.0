"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button, Card, Notice, inputClass } from "@/components/ui";

// Use the origin the visitor actually sees; the server may sit behind a proxy.
function visibleRecoveryUrl(serverUrl: string): string {
  const link = new URL(serverUrl);
  return `${window.location.origin}${link.pathname}${link.hash}`;
}

/**
 * Shows the private recovery link again on request. `prominent` is the post-payment version;
 * the default is a compact card for the "Your data" section.
 */
export function SaveLinkCard({ annual = false, prominent = false }: { annual?: boolean; prominent?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function show() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRecoveryLink();
      setUrl(visibleRecoveryUrl(res.recoveryUrl));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your private link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={prominent ? "ring-2 ring-brand-200" : ""}>
      <h2 className={prominent ? "text-lg font-semibold text-slate-900" : "font-semibold text-slate-900"}>
        {prominent ? "You're on Annual. Save your private link so you don't lose access." : "Your private link"}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {annual ? "Your data and your Annual plan live" : "Your data lives"} in this browser. Your private link opens
        {annual ? " them" : " it"} on another device or after you clear cookies.
      </p>
      {url ? (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              aria-label="Private recovery link"
              className={`${inputClass} font-mono text-xs`}
              value={url}
              onFocus={(e) => e.target.select()}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="mt-3">
            <Notice tone="warning">Anyone with this link can open your data. Keep it like a password.</Notice>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant={prominent ? "primary" : "secondary"}
          className="mt-4"
          disabled={loading}
          onClick={show}
        >
          {loading ? "Loading…" : "Show my private link"}
        </Button>
      )}
      {error && (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      )}
    </Card>
  );
}
