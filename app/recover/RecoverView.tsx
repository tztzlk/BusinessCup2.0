"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button, ButtonLink, Card } from "@/components/ui";

// The secret arrives in the URL fragment (#...), which browsers never send to the server.
// We read it here, post it once to restore the session cookie, and wipe it from the address bar.
// If this browser already holds a household, we ask first: a link someone else sent must not
// silently replace the visitor's own data.
export function RecoverView() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const restore = (secret: string) =>
    api
      .recover(secret)
      .then(() => router.replace("/report"))
      .catch(() => setError("This link is invalid or the data was deleted (inactive for 30 days, or removed by you)."));

  useEffect(() => {
    const secret = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (!secret) {
      setError("This link is missing its key. Open the full link you saved.");
      return;
    }
    api
      .getHousehold()
      .then(() => setPending(secret))
      .catch(() => restore(secret));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pending) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <h1 className="text-xl font-semibold text-slate-900">Open different data?</h1>
        <p className="mt-2 text-sm text-slate-600">
          This browser already has saved data. If you open this link, the current data will only be reachable through its own
          private link. Only continue if this link is yours.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={() => {
              const secret = pending;
              setPending(null);
              void restore(secret);
            }}
          >
            Open the linked data
          </Button>
          <ButtonLink href="/report" variant="secondary">
            Keep my current data
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl text-center">
      {error ? (
        <>
          <h1 className="text-xl font-semibold text-slate-900">Couldn&apos;t open your data</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <div className="mt-5 flex justify-center">
            <ButtonLink href="/check">Start a new checkup</ButtonLink>
          </div>
        </>
      ) : (
        <p className="text-slate-600">Opening your data…</p>
      )}
    </Card>
  );
}
