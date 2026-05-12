"use client";

import { useMemo, useState } from "react";
import { DaySwitcher } from "@/components/coordinator/day-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useShuttle } from "@/context/shuttle-context";
import { childSeatBadgeLabel, formatWindow, totalPaxInRun } from "@/lib/grouping";
import { isOutboundShuttleDay } from "@/lib/shuttle-days";
import type { RunStatus, ShuttleDay, ShuttleRun } from "@/lib/types";
import { RunPassengerDetailBlock } from "./run-passenger-detail";

function statusLabel(s: RunStatus): string {
  if (s === "pending") return "Pending";
  if (s === "departed") return "Departed";
  return "Completed";
}

function nextStatus(s: RunStatus): RunStatus {
  if (s === "pending") return "departed";
  if (s === "departed") return "completed";
  return "pending";
}

function getUpcomingRun(
  runs: ShuttleRun[],
  statuses: Record<string, RunStatus>
): ShuttleRun | null {
  const sorted = [...runs].sort((a, b) => a.startMinutes - b.startMinutes);
  for (const r of sorted) {
    const st = statuses[r.key] ?? "pending";
    if (st !== "completed") return r;
  }
  return null;
}

function AirportView({
  run,
  day,
}: {
  run: ShuttleRun | null;
  day: ShuttleDay;
}) {
  const { config } = useShuttle();
  const outbound = isOutboundShuttleDay(config, day);
  if (!run) {
    return (
      <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center">
        <p className="font-semibold text-[#111827] text-2xl">All runs completed</p>
        <p className="mt-2 text-muted-foreground">Great work today.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-primary/30 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <p className="font-semibold text-primary text-sm uppercase tracking-wide">
          Next run · {outbound ? "Departures" : "Arrivals"}
        </p>
        <p className="font-bold text-[#111827] text-4xl leading-tight">
          {formatWindow(run)}
        </p>
        <p className="text-muted-foreground text-lg">
          {run.terminals.join(" · ")}
        </p>
      </header>
      <ul className="space-y-4">
        {run.passengers.map((p) => (
          <li key={p.id} className="border-[#F3F4F6] border-b pb-4 last:border-0">
            <p className="flex flex-wrap items-center gap-2 font-bold text-3xl text-[#111827]">
              {p.name}
              {childSeatBadgeLabel(p) ? (
                <span className="text-3xl" title={childSeatBadgeLabel(p) ?? ""}>
                  🧒
                </span>
              ) : null}
              <span className="font-semibold text-muted-foreground text-xl">
                ×{p.groupSize}
              </span>
            </p>
            <p className="mt-1 font-mono font-semibold text-2xl text-[#111827]">
              {outbound ? p.outboundFlight : p.inboundFlight}
            </p>
            <p className="text-muted-foreground text-lg">
              {outbound
                ? `Departs ${p.outboundDepartureLabel}`
                : `Arrives ${p.inboundArrivalLabel}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayOfContent({ day }: { day: ShuttleDay }) {
  const { getRuns, runSlots, runStatuses, cycleRunStatus, config } = useShuttle();
  const runs = getRuns(day);
  const [airportView, setAirportView] = useState(false);

  const completed = useMemo(() => {
    return runs.filter((r) => (runStatuses[r.key] ?? "pending") === "completed")
      .length;
  }, [runs, runStatuses]);

  const upcoming = useMemo(
    () => getUpcomingRun(runs, runStatuses),
    [runs, runStatuses]
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-[#111827] text-lg">
          {completed} of {runs.length} runs completed today
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
          <Checkbox
            id={`airport-${day}`}
            checked={airportView}
            onCheckedChange={(c) => setAirportView(Boolean(c))}
          />
          <Label htmlFor={`airport-${day}`} className="font-medium text-sm">
            Airport view
          </Label>
        </div>
      </div>

      {airportView ? (
        <AirportView run={upcoming} day={day} />
      ) : (
        <div className="space-y-4">
          {runs.map((run) => {
            const st = runStatuses[run.key] ?? "pending";
            const slot = runSlots[run.key];
            const vehicleName =
              config.vehicles.find(
                (v) => v.id === slot?.vehicleId && v.shuttleDay === day
              )?.name ?? "Unassigned";
            const collapsed = st === "completed";

            return (
              <Card
                key={run.key}
                className={`border transition-colors ${
                  collapsed
                    ? "border-[#E5E7EB] bg-[#F3F4F6] opacity-70"
                    : "border-[#E5E7EB] bg-white"
                }`}
              >
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle
                        className={`font-bold tracking-tight ${collapsed ? "text-xl" : "text-2xl"} text-[#111827]`}
                      >
                        Run {run.runNumber}{" "}
                        <span className="font-normal text-muted-foreground">
                          {formatWindow(run)}
                        </span>
                      </CardTitle>
                      <p className="mt-1 text-muted-foreground text-lg">
                        {run.terminals.join(" · ")} · {totalPaxInRun(run)} pax
                      </p>
                      <p className="text-[#111827] text-lg">
                        <span className="font-semibold">{vehicleName}</span>
                        {slot?.driverName ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {slot.driverName}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={st === "completed" ? "secondary" : "default"}
                        className={
                          st === "departed"
                            ? "bg-amber-500 text-white hover:bg-amber-500"
                            : st === "completed"
                              ? "bg-zinc-400 text-white"
                              : "bg-primary text-primary-foreground"
                        }
                      >
                        {statusLabel(st)}
                      </Badge>
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        className="font-semibold"
                        onClick={() => cycleRunStatus(run.key)}
                      >
                        Mark: {statusLabel(nextStatus(st))}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {!collapsed ? (
                  <CardContent className="space-y-3 text-lg">
                    <ul className="list-none space-y-3 p-0">
                      {run.passengers.map((p) => (
                        <li key={p.id}>
                          <RunPassengerDetailBlock
                            passenger={p}
                            day={day}
                            className="text-base sm:text-lg"
                          />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                ) : (
                  <CardContent className="pb-4">
                    <p className="text-muted-foreground text-sm">
                      Completed: tap status to reopen cycle.
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DayOfBoard({
  day,
  onDayChange,
}: {
  day: ShuttleDay;
  onDayChange: (d: ShuttleDay) => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="shrink-0 font-semibold text-[#111827] text-xl whitespace-nowrap">
          Day-of operations
        </h2>
        <DaySwitcher
          value={day}
          onValueChange={onDayChange}
          className="min-w-0 w-full lg:max-w-3xl"
        />
      </div>
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]/40">
        <DayOfContent key={day} day={day} />
      </div>
    </div>
  );
}
