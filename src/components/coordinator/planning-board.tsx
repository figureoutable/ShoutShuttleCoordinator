"use client";

import type { LucideIcon } from "lucide-react";
import { CalendarDays, LayoutList, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  isOutboundShuttleDay,
  planningDayPrintLabel,
  planningDayTitle,
  shuttleDayFilterCaption,
} from "@/lib/shuttle-days";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useShuttle } from "@/context/shuttle-context";
import {
  driverEnabledOnShuttleDay,
  driverMayOperateVehicle,
  findDriverByName,
  fleetVehicleIdsForDay,
} from "@/lib/driver-vehicle-eligibility";
import {
  formatRunTerminalsShort,
  formatWindow,
  formatWindowNoHourPad,
  passengerAllocationValue,
  totalPaxInRun,
  UNALLOCATED_RUN_KEY,
} from "@/lib/grouping";
import {
  findConflictingRunForDriver,
  findConflictingRunForVehicle,
} from "@/lib/run-resource-conflicts";
import { runDriverTimingLabels } from "@/lib/timeline-journey";
import type { Passenger, ShuttleDay, ShuttleRun } from "@/lib/types";
import { PlanningTimeline } from "./planning-timeline";
import { RunPassengerDetailBlock } from "./run-passenger-detail";

/** Select sentinel for no driver (slot stores ""). */
const DRIVER_SELECT_NONE = "__none__";

function RunSheetBody({
  dayLabel,
  runs,
  unallocated,
  day,
}: {
  dayLabel: string;
  runs: ShuttleRun[];
  unallocated: Passenger[];
  day: ShuttleDay;
}) {
  const { runSlots, config } = useShuttle();
  return (
    <div className="space-y-4 p-6 text-[#111827]">
      <header className="border-[#E5E7EB] border-b pb-3">
        <p className="font-semibold text-primary text-sm">Shout Shuttle Coordinator</p>
        <h2 className="font-bold text-2xl">{dayLabel}</h2>
        <p className="text-sm">{new Date().toLocaleString("en-GB")}</p>
      </header>
      {runs.map((run, runIdx) => {
        const slot = runSlots[run.key];
        const pax = totalPaxInRun(run);
        const timing = runDriverTimingLabels(run, day, config);
        const isLastRun = runIdx === runs.length - 1;
        const lastNoTailBreak = isLastRun && unallocated.length === 0;
        return (
          <section
            key={run.key}
            className={
              "print-run-sheet-run rounded-lg border border-[#E5E7EB] p-4 break-inside-avoid " +
              (lastNoTailBreak ? "print-run-sheet-run--last" : "")
            }
          >
            <div>
              <h3 className="font-semibold text-lg">
                Run {run.runNumber}{" "}
                <span className="font-normal text-muted-foreground">
                  · {formatWindow(run)}
                </span>
              </h3>
            </div>
            <p className="text-sm">
              <span className="font-medium">Airport &amp; Terminal:</span>{" "}
              {formatRunTerminalsShort(run.terminals) || "-"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Passengers:</span> {pax}
            </p>
            {timing ? (
              <p className="text-sm">
                <span className="font-medium">Driver leave:</span> {timing.leave}
                {" · "}
                <span className="font-medium">Est. return:</span> {timing.returnAt}
              </p>
            ) : null}
            <p className="text-sm">
              <span className="font-medium">Vehicle:</span>{" "}
              {slot?.vehicleId
                ? config.vehicles.find(
                    (v) => v.id === slot.vehicleId && v.shuttleDay === day
                  )?.name ?? slot.vehicleId
                : "Unassigned"}{" "}
              · <span className="font-medium">Driver:</span>{" "}
              {slot?.driverName || "-"}
            </p>
            <div className="mt-2 space-y-2 text-sm">
              {run.passengers.map((p) => (
                <RunPassengerDetailBlock
                  key={p.id}
                  passenger={p}
                  day={day}
                  className="border-[#E5E7EB] bg-white"
                />
              ))}
            </div>
          </section>
        );
      })}
      {unallocated.length > 0 ? (
        <section
          className={
            "print-run-sheet-unallocated rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4 break-inside-avoid " +
            (runs.length > 0 ? "print-run-sheet-unallocated--after-runs" : "")
          }
        >
          <h3 className="font-semibold text-lg text-amber-950">
            To be allocated ({unallocated.length})
          </h3>
          <p className="mt-1 text-amber-900/90 text-sm">
            Not assigned to a run for this day. Adjust placement in Planning list
            view before printing.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            {unallocated.map((p) => (
              <RunPassengerDetailBlock
                key={p.id}
                passenger={p}
                day={day}
                className="border-[#E5E7EB] bg-white"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PassengerPlacementSelect({
  day,
  passengerId,
}: {
  day: ShuttleDay;
  passengerId: string;
}) {
  const { getTemplateRuns, passengerRunOverrides, setPassengerRunOverride } =
    useShuttle();
  const templateRuns = useMemo(() => getTemplateRuns(day), [getTemplateRuns, day]);
  const defaultRunKey =
    templateRuns.find((r) => r.passengers.some((x) => x.id === passengerId))?.key ??
    null;
  const placementValue = passengerAllocationValue(
    day,
    passengerId,
    passengerRunOverrides,
    templateRuns
  );

  return (
    <div className="flex w-full max-w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <Label className="shrink-0 text-muted-foreground text-xs leading-none sm:text-sm">
        Reallocate
      </Label>
      <div className="min-w-0 flex-1">
        <Select
          value={placementValue}
          onValueChange={(val) => {
            if (defaultRunKey != null && val === defaultRunKey) {
              setPassengerRunOverride(day, passengerId, null);
            } else {
              setPassengerRunOverride(day, passengerId, val);
            }
          }}
        >
          <SelectTrigger
            size="sm"
            className="h-7 w-[56%] min-w-0 max-w-full text-xs sm:text-sm"
          >
            <SelectValue placeholder="Choose run">
              {(v: string | null) => {
                if (v == null || v === UNALLOCATED_RUN_KEY) {
                  return "To be allocated";
                }
                const r = templateRuns.find((x) => x.key === v);
                return r ? `Run ${r.runNumber} (${formatWindow(r)})` : String(v);
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNALLOCATED_RUN_KEY}>To be allocated</SelectItem>
            {templateRuns.map((r) => (
              <SelectItem key={r.key} value={r.key}>
                Run {r.runNumber} ({formatWindow(r)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function RunCard({
  run,
  day,
  dayRuns,
}: {
  run: ShuttleRun;
  day: ShuttleDay;
  dayRuns: ShuttleRun[];
}) {
  const { config, runSlots, setRunVehicle, setRunDriver, runScheduleDiagnostics } =
    useShuttle();
  const schedDiag = runScheduleDiagnostics[run.key];
  const vehicles = useMemo(
    () => config.vehicles.filter((v) => v.shuttleDay === day),
    [config.vehicles, day]
  );
  const pax = totalPaxInRun(run);
  const slot = runSlots[run.key];
  const selectedId = slot?.vehicleId ?? "";
  const [resourceHint, setResourceHint] = useState<string | null>(null);

  const showResourceHint = (msg: string) => {
    setResourceHint(msg);
    window.setTimeout(() => setResourceHint(null), 5200);
  };

  const timing = useMemo(
    () => runDriverTimingLabels(run, day, config),
    [run, day, config]
  );

  const runWindowHeading = isOutboundShuttleDay(config, day)
    ? "Passenger pick-up time:"
    : "Passenger Arrival Time:";

  const assignedDriver = slot?.driverName?.trim() ?? "";
  const assignedDriverInRoster = assignedDriver
    ? findDriverByName(config.drivers, assignedDriver, day)
    : null;
  const assignedDriverOkForDay =
    assignedDriverInRoster &&
    driverEnabledOnShuttleDay(assignedDriverInRoster, day);
  const orphanDriverItem =
    assignedDriver &&
    (!assignedDriverInRoster || !assignedDriverOkForDay) ? (
      <SelectItem key="__orphan__" value={assignedDriver}>
        {assignedDriver}
        {!assignedDriverInRoster
          ? " (not in roster for this day)"
          : " (no roster row for this day in Configuration)"}
      </SelectItem>
    ) : null;

  return (
    <Card
      id={`planning-run-${run.key}`}
      size="sm"
      className="scroll-mt-4 gap-0 overflow-hidden rounded-xl border-2 border-primary bg-white py-0 data-[size=sm]:py-0 shadow-none ring-0"
    >
      <CardHeader className="overflow-hidden rounded-t-xl border-primary/15 border-b border-l-0 border-r-0 border-t-0 bg-primary/5 bg-clip-padding px-4 pt-3 pb-3 [.border-b]:pb-3 group-data-[size=sm]/card:[.border-b]:pb-3 group-data-[size=sm]/card:px-4">
        <div className="grid w-full gap-y-3 gap-x-3 sm:grid-cols-3 sm:items-center sm:gap-x-5">
          <div className="flex min-h-0 min-w-0 flex-col justify-start gap-y-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <CardTitle className="text-[#111827] text-xs leading-tight font-medium sm:text-sm">
                Run {run.runNumber}
              </CardTitle>
            </div>
            <p className="text-xs leading-tight font-medium text-[#111827] sm:text-sm">
              Passengers: {pax}
            </p>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col justify-start gap-y-1.5">
            {timing ? (
              <>
                <p className="text-xs leading-tight text-muted-foreground sm:text-sm">
                  <span className="font-medium text-[#111827]">Driver leave</span>
                  <span className="text-muted-foreground">: </span>
                  <span className="tabular-nums">{timing.leave}</span>
                </p>
                <p className="text-xs leading-tight text-muted-foreground sm:text-sm">
                  <span className="font-medium text-[#111827]">Est. return</span>
                  <span className="text-muted-foreground">: </span>
                  <span className="tabular-nums">{timing.returnAt}</span>
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-xs sm:text-sm">-</p>
            )}
          </div>
          <div className="flex min-h-0 min-w-0 flex-col justify-start gap-y-1.5">
            <p className="min-w-0 text-xs leading-tight text-muted-foreground sm:text-sm">
              <span className="font-medium text-[#111827]">{runWindowHeading}</span>{" "}
              <span className="tabular-nums">{formatWindowNoHourPad(run)}</span>
            </p>
            <p className="min-w-0 text-xs leading-tight text-muted-foreground sm:text-sm">
              <span className="font-medium text-[#111827]">Airport &amp; Terminal:</span>{" "}
              <span>{formatRunTerminalsShort(run.terminals) || "Terminal TBC"}</span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-[calc(0.5rem*0.85)] rounded-b-xl bg-white px-2 pb-[calc(0.5rem*0.85)] pt-[calc(0.5rem*0.85)] sm:px-3">
        {resourceHint ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 text-xs sm:text-sm">
            {resourceHint}
          </p>
        ) : null}
        {schedDiag?.unscheduled ? (
          <div
            className="rounded-md border-2 border-amber-500 bg-amber-50/90 px-3 py-2.5 text-amber-950 shadow-sm"
            role="status"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                Unscheduled
              </Badge>
              <span className="font-semibold text-amber-950 text-xs sm:text-sm">
                Schedule could not assign vehicle and driver for this run
              </span>
            </div>
            <p className="mb-1 font-medium text-amber-950 text-[0.7rem] uppercase tracking-wide">
              Resources required
            </p>
            <ul className="mb-3 list-disc space-y-0.5 pl-4 text-xs leading-snug sm:text-sm">
              {schedDiag.requirements.map((line, i) => (
                <li key={`req-${i}`}>{line}</li>
              ))}
            </ul>
            {schedDiag.blockingReasons.length > 0 ? (
              <>
                <p className="mb-1 font-medium text-amber-950 text-[0.7rem] uppercase tracking-wide">
                  Why it failed (with current roster)
                </p>
                <ul className="mb-3 list-disc space-y-0.5 pl-4 text-xs leading-snug sm:text-sm">
                  {schedDiag.blockingReasons.map((line, i) => (
                    <li key={`blk-${i}`}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {schedDiag.suggestedActions.length > 0 ? (
              <>
                <p className="mb-1 font-medium text-amber-950 text-[0.7rem] uppercase tracking-wide">
                  Suggested next steps
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-xs leading-snug sm:text-sm">
                  {schedDiag.suggestedActions.map((line, i) => (
                    <li key={`act-${i}`}>{line}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="mt-2 text-[0.65rem] text-amber-900/80 leading-snug">
              This flag clears when both vehicle and driver are set on this run, or after a
              later successful Schedule for this day.
            </p>
          </div>
        ) : null}
        <div className="grid gap-x-3 gap-y-[calc(0.75rem*0.85)] sm:grid-cols-2">
          <div className="min-w-0 space-y-[calc(0.5rem*0.85)]">
            <Label className="text-xs sm:text-sm">Vehicle</Label>
            <Select
              value={selectedId || "none"}
              onValueChange={(val) => {
                const nextId = val === "none" ? null : val;
                const ok = setRunVehicle(run.key, nextId);
                if (!ok && nextId) {
                  const conflict = findConflictingRunForVehicle(
                    run,
                    dayRuns,
                    runSlots,
                    nextId,
                    day,
                    config
                  );
                  if (conflict) {
                    showResourceHint(
                      `That vehicle is already assigned to run ${conflict.runNumber}, which overlaps this run’s journey (leave through return).`
                    );
                  } else {
                    const driver = findDriverByName(
                      config.drivers,
                      slot?.driverName ?? "",
                      day
                    );
                    const fleetIds = fleetVehicleIdsForDay(config.vehicles, day);
                    if (driver && !driverEnabledOnShuttleDay(driver, day)) {
                      showResourceHint(
                        "That driver is not on the roster for this day in Configuration."
                      );
                    } else if (
                      driver &&
                      !driverMayOperateVehicle(driver, nextId, fleetIds)
                    ) {
                      showResourceHint(
                        "That driver is not ticked for this vehicle in Configuration."
                      );
                    } else {
                      showResourceHint("Could not assign that vehicle.");
                    }
                  }
                }
              }}
            >
              <SelectTrigger
                size="sm"
                className="h-7 w-full min-w-0 text-xs sm:text-sm"
              >
                <SelectValue placeholder="Assign vehicle">
                  {(value: string | null) => {
                    if (value == null || value === "" || value === "none") {
                      return "Unassigned";
                    }
                    const v = vehicles.find((x) => x.id === value);
                    return v
                      ? `${v.name} (${v.type}, ${v.capacity} seats)`
                      : `Unknown vehicle (${value})`;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {vehicles.map((v) => {
                  const blocked =
                    v.id !== selectedId &&
                    findConflictingRunForVehicle(
                      run,
                      dayRuns,
                      runSlots,
                      v.id,
                      day,
                      config
                    ) !== null;
                  return (
                    <SelectItem key={v.id} value={v.id} disabled={blocked}>
                      {v.name} ({v.type}, {v.capacity} seats)
                      {blocked ? " · in use (journey overlap)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-[calc(0.5rem*0.85)]">
            <Label className="text-xs sm:text-sm" htmlFor={`drv-${run.key}`}>
              Driver
            </Label>
            <Select
              value={
                assignedDriver ? assignedDriver : DRIVER_SELECT_NONE
              }
              onValueChange={(val) => {
                const next =
                  val === DRIVER_SELECT_NONE || val == null ? "" : val;
                const ok = setRunDriver(run.key, next);
                if (!ok && next) {
                  const conflict = findConflictingRunForDriver(
                    run,
                    dayRuns,
                    runSlots,
                    next,
                    day,
                    config
                  );
                  if (conflict) {
                    showResourceHint(
                      `That driver is already assigned to run ${conflict.runNumber}, which overlaps this run’s journey (leave through return).`
                    );
                  } else {
                    const driver = findDriverByName(config.drivers, next, day);
                    const vid = slot?.vehicleId;
                    const fleetIds = fleetVehicleIdsForDay(config.vehicles, day);
                    if (
                      driver &&
                      vid &&
                      !driverMayOperateVehicle(driver, vid, fleetIds)
                    ) {
                      showResourceHint(
                        "That driver is not ticked for the assigned vehicle in Configuration."
                      );
                    } else {
                      showResourceHint("Could not assign that driver.");
                    }
                  }
                }
              }}
            >
              <SelectTrigger
                id={`drv-${run.key}`}
                size="sm"
                className="h-7 w-full min-w-0 text-xs sm:text-sm"
              >
                <SelectValue placeholder="Assign driver">
                  {(value: string | null) => {
                    if (value == null || value === DRIVER_SELECT_NONE) {
                      return "Unassigned";
                    }
                    return value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DRIVER_SELECT_NONE}>Unassigned</SelectItem>
                {orphanDriverItem}
                {config.drivers
                  .filter((d) => driverEnabledOnShuttleDay(d, day))
                  .map((d) => {
                    const blocked =
                      d.name !== assignedDriver &&
                      findConflictingRunForDriver(
                        run,
                        dayRuns,
                        runSlots,
                        d.name,
                        day,
                        config
                      ) !== null;
                    return (
                      <SelectItem
                        key={d.id}
                        value={d.name}
                        disabled={blocked}
                      >
                        {d.name}
                        {blocked ? " · in use (journey overlap)" : ""}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ul className="list-none space-y-[calc(0.875rem*0.85)] p-0">
          {run.passengers.map((p) => (
            <li key={p.id}>
              <RunPassengerDetailBlock
                passenger={p}
                day={day}
                variant="planning"
                allocationControl={
                  <PassengerPlacementSelect day={day} passengerId={p.id} />
                }
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DayPlanning({
  day,
  title,
  icon: Icon,
  printLabel,
}: {
  day: ShuttleDay;
  title: string;
  icon: LucideIcon;
  printLabel: string;
}) {
  const { getRuns, getUnallocatedPassengers, config, autoScheduleRunResources } =
    useShuttle();
  const runs = getRuns(day);
  const unallocated = useMemo(
    () => getUnallocatedPassengers(day),
    [getUnallocatedPassengers, day]
  );
  const [printing, setPrinting] = useState(false);
  const [planView, setPlanView] = useState<"list" | "timeline">("list");
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  const dayDriverCount = useMemo(
    () => config.drivers.filter((d) => d.shuttleDay === day).length,
    [config.drivers, day]
  );
  const dayVehicleCount = useMemo(
    () => config.vehicles.filter((v) => v.shuttleDay === day).length,
    [config.vehicles, day]
  );
  const canAutoSchedule =
    dayDriverCount > 0 && dayVehicleCount > 0 && runs.length > 0;

  const focusRunFromTimeline = (runKey: string) => {
    setPlanView("list");
    requestAnimationFrame(() => {
      document
        .getElementById(`planning-run-${runKey}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  useEffect(() => {
    if (!printing) return;
    const onAfter = () => setPrinting(false);
    window.addEventListener("afterprint", onAfter);
    const id = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", onAfter);
    };
  }, [printing]);

  useEffect(() => {
    if (!scheduleMessage) return;
    const id = window.setTimeout(() => setScheduleMessage(null), 9000);
    return () => window.clearTimeout(id);
  }, [scheduleMessage]);

  const handlePrint = () => {
    setPrinting(true);
  };

  const handleSchedule = () => {
    const res = autoScheduleRunResources(day);
    if (res.skippedReason) {
      setScheduleMessage(res.skippedReason);
      return;
    }
    let msg = `Scheduled ${res.assigned} run(s) for ${printLabel}.`;
    if (res.failedRunNumbers.length > 0) {
      msg += ` Could not assign run ${res.failedRunNumbers.join(", ")}: check group size vs van capacity, driver shift times, which vehicles each driver may use, or overlapping run times.`;
    }
    setScheduleMessage(msg);
  };

  return (
    <>
      <div className="no-print flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
        <Tabs
          value={planView}
          onValueChange={(v) => setPlanView(v as "list" | "timeline")}
          className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-0 overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#111827]">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">{title}</h2>
              <Badge variant="secondary">
                {runs.length} runs
                {unallocated.length > 0
                  ? ` · ${unallocated.length} to allocate`
                  : ""}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TabsList variant="default" className="h-9 shrink-0 p-1">
                <TabsTrigger value="list" className="gap-1.5 px-2.5 text-xs sm:text-sm">
                  <LayoutList className="size-3.5 shrink-0 opacity-70" />
                  List
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1.5 px-2.5 text-xs sm:text-sm">
                  <CalendarDays className="size-3.5 shrink-0 opacity-70" />
                  Timeline
                </TabsTrigger>
              </TabsList>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSchedule}
                disabled={!canAutoSchedule}
                title={
                  canAutoSchedule
                    ? "Clear this day’s vehicle and driver slots, then assign from Configuration using shifts and capacity."
                    : "Add at least one driver and one vehicle for this day in Configuration (above), and ensure there are runs."
                }
              >
                Schedule
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={runs.length === 0 && unallocated.length === 0}
              >
                Print run sheet
              </Button>
            </div>
          </div>
          {scheduleMessage ? (
            <p
              className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[#111827] text-sm leading-snug"
              role="status"
            >
              {scheduleMessage}
            </p>
          ) : null}
          <TabsContent
            value="list"
            className="mt-4 min-h-0 flex-1 overflow-y-auto outline-none data-[orientation=horizontal]:mt-4"
          >
            {runs.length === 0 && unallocated.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No shuttle runs for this day with the current upload and rules.
              </p>
            ) : (
              <div className="space-y-3">
                {unallocated.length > 0 ? (
                  <Card className="border-2 border-dashed border-amber-300 bg-amber-50/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-amber-950 text-base">
                        To be allocated ({unallocated.length})
                      </CardTitle>
                      <p className="text-amber-900/90 text-sm">
                        Choose a run for each booking, or leave here until you are
                        ready to assign vehicles and drivers on the run cards below.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {unallocated.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-lg border border-amber-200/80 bg-white p-3"
                        >
                          <RunPassengerDetailBlock
                            passenger={p}
                            day={day}
                            variant="planning"
                            allocationControl={
                              <PassengerPlacementSelect day={day} passengerId={p.id} />
                            }
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
                {runs.length > 0
                  ? runs.map((r) => (
                      <RunCard key={r.key} run={r} day={day} dayRuns={runs} />
                    ))
                  : null}
              </div>
            )}
          </TabsContent>
          <TabsContent
            value="timeline"
            className="mt-4 min-h-0 min-w-0 w-full flex-1 overflow-y-auto outline-none data-[orientation=horizontal]:mt-4"
          >
            <PlanningTimeline
              runs={runs}
              day={day}
              onRunActivate={focusRunFromTimeline}
            />
          </TabsContent>
        </Tabs>
      </div>
      {printing ? (
        <div className="print-only">
          <RunSheetBody
            dayLabel={printLabel}
            runs={runs}
            unallocated={unallocated}
            day={day}
          />
        </div>
      ) : null}
    </>
  );
}

export function PlanningBoard({ selectedDay }: { selectedDay: ShuttleDay }) {
  const { config } = useShuttle();
  const spec = useMemo(
    () => config.shuttleDays.find((s) => s.id === selectedDay),
    [config.shuttleDays, selectedDay]
  );
  const meta = useMemo(() => {
    if (!spec) {
      return {
        title: selectedDay,
        icon: PlaneLanding,
        printLabel: selectedDay,
      };
    }
    const icon = spec.kind === "outbound" ? PlaneTakeoff : PlaneLanding;
    return {
      title: planningDayTitle(config, selectedDay),
      icon,
      printLabel: planningDayPrintLabel(config, selectedDay),
    };
  }, [config, selectedDay, spec]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="no-print mb-4 flex flex-wrap items-center gap-2 text-[#111827]">
        <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="font-semibold text-lg whitespace-nowrap">Planning view</h2>
        <Badge variant="secondary" className="font-normal">
          {shuttleDayFilterCaption(config, selectedDay)}
        </Badge>
      </div>
      <div className="min-h-0 overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]/60">
        <DayPlanning
          day={selectedDay}
          title={meta.title}
          icon={meta.icon}
          printLabel={meta.printLabel}
        />
      </div>
    </div>
  );
}
