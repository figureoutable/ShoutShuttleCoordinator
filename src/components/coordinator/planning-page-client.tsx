"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfigPanel } from "@/components/coordinator/config-panel";
import { DaySwitcher } from "@/components/coordinator/day-switcher";
import { PlanningBoard } from "@/components/coordinator/planning-board";
import { ShuttleDayActions } from "@/components/coordinator/shuttle-day-actions";
import { useShuttle } from "@/context/shuttle-context";
import type { ShuttleDay } from "@/lib/types";

export function PlanningPageClient() {
  const { config } = useShuttle();
  const firstDayId = useMemo(
    () => config.shuttleDays[0]?.id ?? "tuesday",
    [config.shuttleDays]
  );
  const [day, setDay] = useState<ShuttleDay>(firstDayId);
  useEffect(() => {
    setDay((d) => (config.shuttleDays.some((s) => s.id === d) ? d : firstDayId));
  }, [config.shuttleDays, firstDayId]);

  return (
    <div className="min-h-screen bg-white">
      <div className="no-print border-[#E5E7EB] border-b bg-[#F9FAFB]/90">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-4">
          <p className="font-medium text-[#111827] text-sm">Day (resources &amp; planning)</p>
          <div className="flex min-w-0 items-stretch gap-2 sm:gap-3">
            <DaySwitcher
              value={day}
              onValueChange={setDay}
              className="min-w-0 flex-1 self-center"
            />
            <ShuttleDayActions selectedDay={day} />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        <ConfigPanel planningDay={day} />
      </div>
      <PlanningBoard selectedDay={day} />
    </div>
  );
}
