"use client";

import { useState } from "react";
import { CheckupView } from "./CheckupView";
import { api } from "@/lib/api-client";
import { isAnnual } from "@/lib/plan";
import type { ChecklistItem, ChecklistStatus, HouseholdData } from "@/lib/types";

// The user's own checkup: lib/engine runs in the browser on the decrypted household data.
export function ReportEngineSection({ data, onChanged }: { data: HouseholdData; onChanged?: () => void }) {
  const month = new Date().getMonth(); // Jan-Apr = tax season
  const [mode, setMode] = useState<"november" | "january">(month <= 3 ? "january" : "november");
  const today = new Date().toISOString().slice(0, 10);

  const saveStatus = async (item: ChecklistItem, status: ChecklistStatus) => {
    const existing = data.checklist.find((c) => c.formType === item.formType);
    if (existing) await api.setChecklistStatus(existing.id, status);
    else await api.saveChecklist([{ formType: item.formType, source: item.source, status, dueDate: item.dueDate }]);
    onChanged?.();
  };

  return (
    <div>
      <div className="no-print mt-6 inline-flex rounded-lg border border-slate-300 bg-white p-1 text-sm" role="tablist">
        {(["november", "january"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-md px-4 py-1.5 font-medium ${mode === m ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
          >
            {m === "november" ? "Paycheck checkup" : "Tax season"}
          </button>
        ))}
      </div>
      <CheckupView
        data={data}
        asOf={today}
        mode={mode}
        onChecklistStatus={saveStatus}
        packetTitle="Accountant packet"
        locked={!isAnnual(data)}
      />
    </div>
  );
}
