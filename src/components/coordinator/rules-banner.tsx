"use client";

import { useShuttle } from "@/context/shuttle-context";

export function RulesBanner() {
  const { config } = useShuttle();
  const maxVehicleCapacity =
    config.vehicles.reduce((max, vehicle) => Math.max(max, vehicle.capacity), 0) || 0;
  const seats = Math.max(maxVehicleCapacity - 1, 0);
  const win = config.groupingWindowMinutes;
  const sat = config.saturdayStartTime;

  const pills = [
    `🚐 ${seats} seats per van (incl. driver)`,
    `⏱ Max ${win} min grouping window`,
    `📍 4 drop-off locations`,
    `🕗 Saturday: no runs before ${sat}`,
  ];

  return (
    <div className="no-print border-[#E5E7EB] border-b bg-white px-4 py-2">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-2">
        {pills.map((label) => (
          <span
            key={label}
            className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 font-medium text-[#111827] text-xs"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
