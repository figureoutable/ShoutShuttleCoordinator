"use client";

import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShuttle } from "@/context/shuttle-context";
import { effectiveDriverVehicleIds } from "@/lib/driver-vehicle-eligibility";
import { cn } from "@/lib/utils";
import type {
  Driver,
  ShuttleDay,
  ShuttleDaySpec,
  TimelineTrafficWindow,
  Vehicle,
} from "@/lib/types";

/** Human-readable list of time bands for the config summary (e.g. 07:00–09:30 · 16:00–19:00). */
function summarizeTrafficWindows(windows: TimelineTrafficWindow[]): string {
  const parts: string[] = [];
  for (const w of windows) {
    const s = w.start.trim();
    const e = w.end.trim();
    if (!s && !e) continue;
    if (s && e) parts.push(`${s}–${e}`);
    else parts.push(s || e);
  }
  return parts.length > 0 ? parts.join(" · ") : "(none set)";
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Same grid as driver rows so Name columns share one width across vehicles & drivers. */
const resourceRowCardClass = "rounded-lg border border-[#E5E7EB] bg-white";
const resourceRowGridClass =
  "grid w-full grid-cols-1 gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-end";

function VehicleConfigRow({
  vehicle: v,
  planningDayLabel,
  onUpdate,
  onRemove,
}: {
  vehicle: Vehicle;
  planningDayLabel: string;
  onUpdate: (id: string, patch: Partial<Vehicle>) => void;
  onRemove: (vehicle: Vehicle) => void;
}) {
  return (
    <div className={cn(resourceRowCardClass, resourceRowGridClass)}>
      <div className="min-w-0 space-y-1">
        <Label className="text-xs">Name</Label>
        <Input
          value={v.name}
          onChange={(e) => onUpdate(v.id, { name: e.target.value })}
        />
      </div>
      <div className="min-w-0 space-y-1">
        <Label className="text-xs">Type</Label>
        <Select
          value={v.type}
          onValueChange={(val) => {
            if (val === "Van" || val === "Car") {
              onUpdate(v.id, { type: val });
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Van">Van</SelectItem>
            <SelectItem value="Car">Car</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-1">
        <Label className="text-xs">Capacity</Label>
        <Input
          type="number"
          min={2}
          value={v.capacity}
          onChange={(e) =>
            onUpdate(v.id, {
              capacity: Number(e.target.value) || 2,
            })
          }
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive justify-self-end sm:justify-self-center"
        onClick={() => onRemove(v)}
        aria-label={`Remove ${v.name} from ${planningDayLabel} only`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function weekdayLabelForPlanningDay(
  specs: ShuttleDaySpec[],
  planningDay: ShuttleDay
): string {
  return specs.find((s) => s.id === planningDay)?.weekdayLabel ?? planningDay;
}

function DriverConfigRow({
  driver: d,
  vehicles,
  planningDayLabel,
  onUpdate,
  onRemove,
}: {
  driver: Driver;
  vehicles: Vehicle[];
  planningDayLabel: string;
  onUpdate: (id: string, patch: Partial<Driver>) => void;
  onRemove: (driver: Driver) => void;
}) {
  const fleetIds = vehicles.map((v) => v.id);
  const allowedSet = new Set(effectiveDriverVehicleIds(d, fleetIds));

  const toggleVehicleAllowed = (vehicleId: string, checked: boolean) => {
    const nextSet = new Set(allowedSet);
    if (checked) nextSet.add(vehicleId);
    else nextSet.delete(vehicleId);
    const nextArr = fleetIds.filter((id) => nextSet.has(id));
    if (nextArr.length === fleetIds.length) {
      onUpdate(d.id, { allowedVehicleIds: undefined });
    } else {
      onUpdate(d.id, { allowedVehicleIds: nextArr });
    }
  };

  return (
    <div className={resourceRowCardClass}>
      <div className={resourceRowGridClass}>
        <div className="min-w-0 space-y-1">
          <Label className="text-xs">Name</Label>
          <Input
            value={d.name}
            onChange={(e) => onUpdate(d.id, { name: e.target.value })}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-xs">Shift from</Label>
          <Input
            type="time"
            value={d.shiftStart}
            onChange={(e) => onUpdate(d.id, { shiftStart: e.target.value })}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-xs">Shift to</Label>
          <Input
            type="time"
            value={d.shiftEnd}
            onChange={(e) => onUpdate(d.id, { shiftEnd: e.target.value })}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive justify-self-end sm:justify-self-center"
          onClick={() => onRemove(d)}
          aria-label={`Remove ${d.name} from ${planningDayLabel} only`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {vehicles.length > 0 ? (
        <div className="border-t border-[#E5E7EB] px-3 py-2">
          <p className="text-muted-foreground text-xs">
            Can drive (Planning will only allow this driver with a ticked vehicle
            on the same run)
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {vehicles.map((v) => {
              const cbId = `drv-${d.id}-veh-${v.id}`;
              return (
                <div key={v.id} className="flex items-center gap-2">
                  <Checkbox
                    id={cbId}
                    checked={allowedSet.has(v.id)}
                    onCheckedChange={(c) => toggleVehicleAllowed(v.id, Boolean(c))}
                  />
                  <Label htmlFor={cbId} className="cursor-pointer font-normal text-sm">
                    {v.name}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ConfigPanel({ planningDay }: { planningDay: ShuttleDay }) {
  const { config, setConfig, removeDriver, removeVehicle } = useShuttle();
  const [open, setOpen] = useState(true);
  const baseId = useId();

  const updateVehicle = (id: string, patch: Partial<Vehicle>) => {
    setConfig((c) => ({
      ...c,
      vehicles: c.vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  };

  const addVehicle = () => {
    const newId = uid("v");
    setConfig((c) => ({
      ...c,
      vehicles: [
        ...c.vehicles,
        {
          id: newId,
          name: "Car",
          type: "Car",
          capacity: 4,
          shuttleDay: planningDay,
        },
      ],
      drivers: c.drivers.map((d) => {
        if (d.shuttleDay !== planningDay) return d;
        if (d.allowedVehicleIds === undefined || d.allowedVehicleIds.length === 0) {
          return d;
        }
        return {
          ...d,
          allowedVehicleIds: [...new Set([...d.allowedVehicleIds, newId])],
        };
      }),
    }));
  };

  const updateDriver = (id: string, patch: Partial<Driver>) => {
    setConfig((c) => ({
      ...c,
      drivers: c.drivers.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  };

  const addDriver = () => {
    setConfig((c) => ({
      ...c,
      drivers: [
        ...c.drivers,
        {
          id: uid("d"),
          name: "New driver",
          shuttleDay: planningDay,
          shiftStart: "06:00",
          shiftEnd: "22:00",
        },
      ],
    }));
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="no-print border-[#E5E7EB] bg-[#F9FAFB] shadow-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-[#111827] text-base">
              Configuration
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Grouping, timing, vehicles, and drivers for this event. Changes save
              automatically in this browser (including new vehicles and drivers).
            </p>
          </div>
          <CollapsibleTrigger
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 font-medium text-sm shadow-sm hover:bg-accent"
            type="button"
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {open ? "Collapse" : "Expand"}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 md:items-stretch">
              <div className="min-w-0 space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <div className="space-y-2">
                  <Label
                    htmlFor={`${baseId}-gw`}
                    className="text-muted-foreground text-xs font-normal"
                  >
                    Run grouping: window (minutes)
                  </Label>
                  <Input
                    id={`${baseId}-gw`}
                    type="number"
                    min={15}
                    step={5}
                    className="max-w-[11rem]"
                    value={config.groupingWindowMinutes}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        groupingWindowMinutes: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <div className="space-y-2">
                  <Label
                    htmlFor={`${baseId}-tt`}
                    className="text-muted-foreground text-xs font-normal"
                  >
                    Going-leg drive: minutes
                  </Label>
                  <Input
                    id={`${baseId}-tt`}
                    type="number"
                    min={5}
                    step={5}
                    className="max-w-[11rem]"
                    value={config.travelTimeToHeathrowMinutes}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        travelTimeToHeathrowMinutes: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <div className="space-y-2">
                  <Label
                    htmlFor={`${baseId}-touchdown`}
                    className="text-muted-foreground text-xs font-normal"
                  >
                    Airport clearance time (minutes)
                  </Label>
                  <p className="text-muted-foreground text-[0.65rem] leading-snug">
                    Inbound driver leave = first landing + clearance + exit-to-meet − going-leg drive
                    (see Planning run cards: Driver leave).
                  </p>
                  <Input
                    id={`${baseId}-touchdown`}
                    type="number"
                    min={0}
                    step={5}
                    className="max-w-[11rem]"
                    value={config.touchdownToAirportExitMinutes}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        touchdownToAirportExitMinutes: Math.max(
                          0,
                          Number(e.target.value) || 0
                        ),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <div className="space-y-2">
                  <Label
                    htmlFor={`${baseId}-exit`}
                    className="text-muted-foreground text-xs font-normal"
                  >
                    Return leg: exit to meet (minutes)
                  </Label>
                  <Input
                    id={`${baseId}-exit`}
                    type="number"
                    min={0}
                    step={5}
                    className="max-w-[11rem]"
                    value={config.inboundAirportExitWaitMinutes}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        inboundAirportExitWaitMinutes: Math.max(
                          0,
                          Number(e.target.value) || 0
                        ),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                <div className="space-y-2">
                  <Label
                    htmlFor={`${baseId}-handover`}
                    className="text-muted-foreground text-xs font-normal"
                  >
                    Loading/Unloading
                  </Label>
                  <Input
                    id={`${baseId}-handover`}
                    type="number"
                    min={0}
                    step={5}
                    className="max-w-[11rem]"
                    value={config.inboundHandoverBufferMinutes}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        inboundHandoverBufferMinutes: Math.max(
                          0,
                          Number(e.target.value) || 0
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-[#E5E7EB] bg-white p-4">
              <h3 className="font-semibold text-[#111827] text-sm">
                Planning timeline: road traffic
              </h3>
              <p className="text-muted-foreground text-xs">
                Each outbound and return drive is multiplied when the leg starts in a
                peak window (local time). Does not change CSV grouping.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                <div
                  className="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-3 text-sm leading-snug text-[#111827]"
                  aria-live="polite"
                >
                  <span className="shrink-0 font-semibold text-[#111827]">
                    Peak times (local 24h)
                  </span>
                  <span className="min-w-0">
                    <span className="font-semibold text-[#111827]">Peak</span>
                    <span className="text-muted-foreground">
                      {" "}
                      (+{config.timelineTraffic.peakExtraPercent}% on travel):{" "}
                    </span>
                    {summarizeTrafficWindows(config.timelineTraffic.peakWindows)}
                  </span>
                </div>
                <div className="flex min-w-0 shrink-0 flex-row flex-wrap items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-3 text-sm text-[#111827] sm:min-w-[14rem]">
                  <Label
                    htmlFor={`${baseId}-tt-peak`}
                    className="shrink-0 font-semibold text-[#111827]"
                  >
                    Peak extra on travel (%)
                  </Label>
                  <Input
                    id={`${baseId}-tt-peak`}
                    type="number"
                    min={0}
                    step={5}
                    className="h-9 w-[5.5rem] text-sm"
                    value={config.timelineTraffic.peakExtraPercent}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        timelineTraffic: {
                          ...c.timelineTraffic,
                          peakExtraPercent: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        },
                      }))
                    }
                  />
                </div>
              </div>
              <p className="font-semibold text-[#111827] text-sm">
                Edit peak windows
              </p>
              <p className="text-muted-foreground text-xs">
                Morning and evening rush bands (HH:mm). Shown above in one line for a
                quick read.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid grid-cols-2 gap-2 rounded-md border border-[#E5E7EB] bg-white p-2">
                  <p className="col-span-2 font-medium text-[#111827] text-xs">
                    Morning peak
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input
                      value={config.timelineTraffic.peakWindows[0]?.start ?? "07:00"}
                      onChange={(e) =>
                        setConfig((c) => {
                          const w = [...c.timelineTraffic.peakWindows];
                          w[0] = { ...w[0], start: e.target.value };
                          return {
                            ...c,
                            timelineTraffic: {
                              ...c.timelineTraffic,
                              peakWindows: w,
                            },
                          };
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input
                      value={config.timelineTraffic.peakWindows[0]?.end ?? "09:30"}
                      onChange={(e) =>
                        setConfig((c) => {
                          const w = [...c.timelineTraffic.peakWindows];
                          w[0] = { ...w[0], end: e.target.value };
                          return {
                            ...c,
                            timelineTraffic: {
                              ...c.timelineTraffic,
                              peakWindows: w,
                            },
                          };
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-[#E5E7EB] bg-white p-2">
                  <p className="col-span-2 font-medium text-[#111827] text-xs">
                    Evening peak
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input
                      value={config.timelineTraffic.peakWindows[1]?.start ?? "16:00"}
                      onChange={(e) =>
                        setConfig((c) => {
                          const w = [...c.timelineTraffic.peakWindows];
                          w[1] = { ...(w[1] ?? { start: "16:00", end: "19:00" }), start: e.target.value };
                          return {
                            ...c,
                            timelineTraffic: {
                              ...c.timelineTraffic,
                              peakWindows: w,
                            },
                          };
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input
                      value={config.timelineTraffic.peakWindows[1]?.end ?? "19:00"}
                      onChange={(e) =>
                        setConfig((c) => {
                          const w = [...c.timelineTraffic.peakWindows];
                          w[1] = { ...(w[1] ?? { start: "16:00", end: "19:00" }), end: e.target.value };
                          return {
                            ...c,
                            timelineTraffic: {
                              ...c.timelineTraffic,
                              peakWindows: w,
                            },
                          };
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-[#111827] text-sm">
                  Vehicles available
                </h3>
                <Button type="button" variant="default" size="sm" onClick={addVehicle}>
                  Add vehicle
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                The list is for{" "}
                <span className="font-medium text-foreground">
                  {weekdayLabelForPlanningDay(config.shuttleDays, planningDay)}
                </span>{" "}
                only. Add vehicle creates a fleet row for that day. Trash removes that
                van from this day and clears it from run assignments (other days are
                unchanged).
              </p>
              <div className="space-y-3">
                {config.vehicles
                  .filter((v) => v.shuttleDay === planningDay)
                  .map((v) => (
                    <VehicleConfigRow
                      key={v.id}
                      vehicle={v}
                      planningDayLabel={weekdayLabelForPlanningDay(
                        config.shuttleDays,
                        planningDay
                      )}
                      onUpdate={updateVehicle}
                      onRemove={removeVehicle}
                    />
                  ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-[#111827] text-sm">
                  Drivers available
                </h3>
                <Button type="button" variant="default" size="sm" onClick={addDriver}>
                  Add driver
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                The list is for{" "}
                <span className="font-medium text-foreground">
                  {weekdayLabelForPlanningDay(config.shuttleDays, planningDay)}
                </span>{" "}
                only (use the day control above Planning to switch days). Add driver
                creates a roster row for that day. Trash removes that row and clears
                their assignments on runs for that day only (other days are
                unchanged). Shift times apply on this day. Names should match Planning
                assignments. Tick vehicles each driver may use; leave all ticked for
                no restriction.
              </p>
              <div className="space-y-3">
                {config.drivers
                  .filter((d) => d.shuttleDay === planningDay)
                  .map((d) => (
                    <DriverConfigRow
                      key={d.id}
                      driver={d}
                      vehicles={config.vehicles.filter(
                        (v) => v.shuttleDay === planningDay
                      )}
                      planningDayLabel={weekdayLabelForPlanningDay(
                        config.shuttleDays,
                        planningDay
                      )}
                      onUpdate={updateDriver}
                      onRemove={removeDriver}
                    />
                  ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
