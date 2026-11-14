"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { ButtonLink, Card } from "@/components/ui";

// The secret arrives in the URL fragment (#...), which browsers never send to the server.
// We read it here, post it once to restore the session cookie, and wipe it from the address bar.
export function RecoverView() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const secret = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (!secret) {
      setError("This link is missing its key. Open the full link you saved.");
      return;
    }
    api
      .recover(secret)
      .then(() => router.replace("/report"))
      .catch(() => setError("This link is invalid or the data was deleted (inactive for 30 days, or removed by you)."));
  }, [router]);

  return (
    <Card className="mx-auto max-w-xl text-center">
      {error ? (
        <>
          <h1 className="text-xl font-bold text-slate-900">Couldn&apos;t open your data</h1>
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
