"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { HouseholdData } from "@/lib/types";

// The household's decrypted data (GET /api/household), loaded once by the app shell and shared by
// the header and every page. Pages call refresh() after they change something on the server.

export type HouseholdState =
  | { status: "loading" }
  | { status: "none" } // no household cookie in this browser
  | { status: "ready"; data: HouseholdData }
  | { status: "error"; error: string };

interface HouseholdContextValue {
  state: HouseholdState;
  data: HouseholdData | null;
  /** Reloads from the server. Resolves to null when there is no household; rejects on other errors. */
  refresh: () => Promise<HouseholdData | null>;
  /** After "Delete my data". */
  clear: () => void;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HouseholdState>({ status: "loading" });

  const refresh = useCallback(async (): Promise<HouseholdData | null> => {
    try {
      const data = await api.getHousehold();
      setState({ status: "ready", data });
      return data;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setState({ status: "none" });
        return null;
      }
      const error = e instanceof Error ? e.message : "Could not load your data.";
      // Keep showing what we had if a reload fails; the caller reports the error.
      setState((s) => (s.status === "ready" ? s : { status: "error", error }));
      throw e;
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const clear = useCallback(() => setState({ status: "none" }), []);

  const value = useMemo<HouseholdContextValue>(
    () => ({ state, data: state.status === "ready" ? state.data : null, refresh, clear }),
    [state, refresh, clear],
  );
  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used inside <HouseholdProvider>");
  return ctx;
}
