"use client";

import { AddShuttleDayButton } from "@/components/coordinator/add-shuttle-day-button";
import { Button } from "@/components/ui/button";
import { useShuttle } from "@/context/shuttle-context";
import { inboundShuttleDaySpecs } from "@/lib/shuttle-days";
import type { ShuttleDay } from "@/lib/types";

export function ShuttleDayActions({ selectedDay }: { selectedDay: ShuttleDay }) {
  const { config, setConfig } = useShuttle();
  const spec = config.shuttleDays.find((s) => s.id === selectedDay);
  const inboundCount = inboundShuttleDaySpecs(config.shuttleDays).length;
  const canRemove =
    spec &&
    ((spec.kind === "inbound" && inboundCount > 1) || spec.kind === "outbound");

  return (
    <div className="flex w-[10.75rem] shrink-0 flex-col justify-center gap-2 self-stretch sm:w-[11.25rem]">
      <AddShuttleDayButton buttonClassName="w-full" />
      {canRemove && spec ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const msg =
              spec.kind === "outbound"
                ? `Remove ${spec.weekdayLabel} (${spec.id}) and its fleet/driver rows for departures? Outbound planning will be empty until you add a departures day again with Add day.`
                : `Remove ${spec.weekdayLabel} (${spec.id}) and its fleet/driver rows for that day?`;
            if (!window.confirm(msg)) {
              return;
            }
            setConfig((c) => ({
              ...c,
              shuttleDays: c.shuttleDays.filter((s) => s.id !== spec.id),
              vehicles: c.vehicles.filter((v) => v.shuttleDay !== spec.id),
              drivers: c.drivers.filter((d) => d.shuttleDay !== spec.id),
            }));
          }}
        >
          Remove Day
        </Button>
      ) : null}
    </div>
  );
}
