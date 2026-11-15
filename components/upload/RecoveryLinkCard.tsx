"use client";

import { useState } from "react";
import { CopyIcon, KeyRoundIcon } from "lucide-react";
import { Alert, Button, Card, Input } from "@/components/ui";

// Use the origin the visitor actually sees; the server may sit behind a proxy.
export function visibleRecoveryUrl(serverUrl: string): string {
  const link = new URL(serverUrl);
  return `${window.location.origin}${link.pathname}${link.hash}`;
}

/** The private link shown once, right after a household is created. */
export function RecoveryLinkCard({ url, onDone, doneLabel = "I saved it — continue" }: { url: string; onDone?: () => void; doneLabel?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
          <KeyRoundIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-fg-primary">Save your private link</h2>
          <p className="mt-0.5 text-sm text-fg-secondary">It&apos;s the only way back to your data from another device or after you clear cookies. We can&apos;t recover it.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input readOnly aria-label="Private recovery link" className="font-mono text-xs" value={url} onFocus={(e) => e.target.select()} />
        <Button
          variant="secondary"
          icon={<CopyIcon aria-hidden="true" className="h-4 w-4" />}
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
      <Alert tone="warning" className="mt-3">
        Anyone with this link can open your data. Keep it like a password, and don&apos;t share it.
      </Alert>
      {onDone && (
        <Button className="mt-4" onClick={onDone}>
          {doneLabel}
        </Button>
      )}
    </Card>
  );
}
