"use client";

import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ShuttleDay } from "@/lib/types";

export const SHUTTLE_DAY_TABS: {
  id: ShuttleDay;
  label: string;
  dateLine: string;
  kindLine: string;
}[] = [
  { id: "tuesday", label: "Tuesday", dateLine: "22 Jul", kindLine: "Arrivals" },
  {
    id: "wednesday",
    label: "Wednesday",
    dateLine: "23 Jul",
    kindLine: "Arrivals",
  },
  {
    id: "saturday",
    label: "Saturday",
    dateLine: "26 Jul",
    kindLine: "Departures",
  },
];

/** Short caption for filters / config copy, e.g. "Tuesday 22 Jul · Arrivals". */
export function shuttleDayFilterCaption(day: ShuttleDay): string {
  const d = SHUTTLE_DAY_TABS.find((x) => x.id === day);
  if (!d) return day;
  return `${d.label} ${d.dateLine} · ${d.kindLine}`;
}

export function DaySwitcher({
  value,
  onValueChange,
  className,
}: {
  value: ShuttleDay;
  onValueChange: (day: ShuttleDay) => void;
  className?: string;
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as ShuttleDay)}
      className={cn("w-full min-w-0", className)}
    >
      <TabsList
        variant="default"
        className="no-print flex !h-auto min-h-0 w-full items-stretch gap-1.5 p-1.5"
      >
        {SHUTTLE_DAY_TABS.map((d) => (
          <TabsTrigger
            key={d.id}
            value={d.id}
            className={cn(
              "!h-auto min-h-14 min-w-0 flex-1 flex-col justify-center gap-0.5 px-2 py-2.5 sm:min-h-16 sm:px-3 sm:py-3",
              "whitespace-normal text-center leading-tight",
              "text-foreground/70 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm"
            )}
          >
            <span className="font-semibold text-sm sm:text-[0.95rem]">{d.label}</span>
            <span className="max-w-full px-0.5 font-medium text-[0.65rem] opacity-85 leading-snug sm:text-[0.7rem] data-active:opacity-95">
              {d.dateLine} · {d.kindLine}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
