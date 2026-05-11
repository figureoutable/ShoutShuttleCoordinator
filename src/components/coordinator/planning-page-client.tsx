"use client";

import { useState } from "react";
import { ConfigPanel } from "@/components/coordinator/config-panel";
import { DaySwitcher } from "@/components/coordinator/day-switcher";
import { PlanningBoard } from "@/components/coordinator/planning-board";
import type { ShuttleDay } from "@/lib/types";

export function PlanningPageClient() {
  const [day, setDay] = useState<ShuttleDay>("tuesday");

  return (
    <div className="min-h-screen bg-white">
      <div className="no-print border-[#E5E7EB] border-b bg-[#F9FAFB]/90">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-4">
          <p className="font-medium text-[#111827] text-sm">Day (resources &amp; planning)</p>
          <DaySwitcher value={day} onValueChange={setDay} />
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        <ConfigPanel planningDay={day} />
      </div>
      <PlanningBoard selectedDay={day} />
    </div>
  );
}
