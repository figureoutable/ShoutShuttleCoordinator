"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfigPanel } from "@/components/coordinator/config-panel";
import { DayOfBoard } from "@/components/coordinator/day-of-board";
import { useShuttle } from "@/context/shuttle-context";
import type { ShuttleDay } from "@/lib/types";

export default function DayOfPage() {
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
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        <ConfigPanel planningDay={day} />
      </div>
      <DayOfBoard day={day} onDayChange={setDay} />
    </div>
  );
}
