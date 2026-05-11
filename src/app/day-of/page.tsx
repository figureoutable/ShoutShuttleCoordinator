"use client";

import { useState } from "react";
import { ConfigPanel } from "@/components/coordinator/config-panel";
import { DayOfBoard } from "@/components/coordinator/day-of-board";
import type { ShuttleDay } from "@/lib/types";

export default function DayOfPage() {
  const [day, setDay] = useState<ShuttleDay>("tuesday");

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
        <ConfigPanel planningDay={day} />
      </div>
      <DayOfBoard day={day} onDayChange={setDay} />
    </div>
  );
}
