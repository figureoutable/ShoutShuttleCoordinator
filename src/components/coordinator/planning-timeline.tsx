"use client";

import { useMemo } from "react";
import { useShuttle } from "@/context/shuttle-context";
import {
  formatRunTerminalsShort,
  formatWindow,
  totalPaxInRun,
} from "@/lib/grouping";
import {
  computeRunTimelineJourney,
  runDriverTimingLabels,
  runsOverlapJourney,
  type RunTimelineJourney,
} from "@/lib/timeline-journey";
import { minutesToLabel } from "@/lib/time";
import type {
  CoordinatorConfig,
  RunSlotState,
  ShuttleDay,
  ShuttleRun,
  Vehicle,
} from "@/lib/types";
import type { CanonicalStop } from "@/lib/locations";
import { cn } from "@/lib/utils";

const PX_PER_MINUTE = 1.35;
/** Minimum block height so very short journeys stay easy to click. */
const TIMELINE_RUN_BLOCK_MIN_HEIGHT_PX = 28;

function uniqueLocationLines(
  values: Array<CanonicalStop | "Unknown location">
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (v === "Unknown location") continue;
    const s = String(v).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function passengerNameList(run: ShuttleRun): string {
  return run.passengers
    .map((p) =>
      p.spouseName?.trim()
        ? `${p.name.trim()} & ${p.spouseName.trim()}`
        : p.name.trim()
    )
    .filter(Boolean)
    .join(", ");
}

function TimelineRunDetailHeader({
  run,
  day,
  config,
  vehicleName,
  driver,
}: {
  run: ShuttleRun;
  day: ShuttleDay;
  config: CoordinatorConfig;
  vehicleName: string | null;
  driver: string | undefined | null;
}) {
  const timing = runDriverTimingLabels(run, day, config);
  const isSaturday = day === "saturday";
  const pax = totalPaxInRun(run);
  const terminals =
    formatRunTerminalsShort(run.terminals) || run.terminals[0]?.trim() || "-";
  const rawNames = passengerNameList(run);
  const namesShown =
    rawNames.length > 200 ? `${rawNames.slice(0, 197)}…` : rawNames;
  const stops = uniqueLocationLines(
    isSaturday
      ? run.passengers.map((p) => p.outboundPickUpCanonical)
      : run.passengers.map((p) => p.inboundDropOffCanonical)
  );
  const stopsShown = stops.length ? stops.join(" · ") : "-";
  const stopHeading = isSaturday ? "Pick-up points" : "Drop off points";
  const vLine = vehicleName?.trim() ? vehicleName : "-";
  const dLine = driver?.trim() ? driver : "-";

  return (
    <div className="shrink-0 border-primary/20 border-b bg-primary px-1.5 py-1 text-left text-[0.58rem] leading-snug opacity-95">
      <p className="font-semibold">Run: {run.runNumber}</p>
      {timing ? (
        <>
          <p>
            <span className="font-semibold">
              {isSaturday ? "Depart:" : "Driver leave:"}
            </span>{" "}
            <span className="tabular-nums">{timing.leave}</span>
          </p>
          <p>
            <span className="font-semibold">Est. return:</span>{" "}
            <span className="tabular-nums">{timing.returnAt}</span>
          </p>
        </>
      ) : null}
      <p>
        <span className="font-semibold">Vehicle:</span> {vLine}
      </p>
      <p>
        <span className="font-semibold">Driver:</span> {dLine}
      </p>
      <div className="h-1 shrink-0" aria-hidden />
      <p className="break-words">
        <span className="font-semibold">Pick up terminal:</span> {terminals}
      </p>
      <p className="line-clamp-4 break-words" title={rawNames || undefined}>
        <span className="font-semibold">Passengers:</span> {namesShown || "-"}
      </p>
      <p>
        <span className="font-semibold">No. Passengers:</span> {pax}
      </p>
      <p className="line-clamp-4 break-words" title={stops.join(" · ")}>
        <span className="font-semibold">{stopHeading}:</span> {stopsShown}
      </p>
    </div>
  );
}

type TimelineColumn =
  | { kind: "vehicle"; id: string; label: string }
  | { kind: "unassigned"; id: "__unassigned__"; label: "Unassigned" }
  | { kind: "all"; id: "__all__"; label: "Runs" };

function buildTimelineColumns(
  vehicles: Vehicle[],
  runs: ShuttleRun[],
  runSlots: Record<string, RunSlotState>
): TimelineColumn[] {
  const knownIds = new Set(vehicles.map((v) => v.id));
  const hasUnassigned = runs.some((r) => {
    const vid = runSlots[r.key]?.vehicleId;
    return !vid || !knownIds.has(vid);
  });
  if (vehicles.length === 0) {
    return [{ kind: "all", id: "__all__", label: "Runs" }];
  }
  const cols: TimelineColumn[] = vehicles.map((v) => ({
    kind: "vehicle",
    id: v.id,
    label: v.name,
  }));
  if (hasUnassigned) {
    cols.push({
      kind: "unassigned",
      id: "__unassigned__",
      label: "Unassigned",
    });
  }
  return cols;
}

function runsInTimelineColumn(
  runs: ShuttleRun[],
  col: TimelineColumn,
  runSlots: Record<string, RunSlotState>,
  knownVehicleIds: Set<string>
): ShuttleRun[] {
  if (col.kind === "all") return runs;
  if (col.kind === "unassigned") {
    return runs.filter((r) => {
      const vid = runSlots[r.key]?.vehicleId;
      return !vid || !knownVehicleIds.has(vid);
    });
  }
  return runs.filter((r) => runSlots[r.key]?.vehicleId === col.id);
}

function clusterRuns(
  runs: ShuttleRun[],
  day: ShuttleDay,
  config: CoordinatorConfig
): ShuttleRun[][] {
  const visited = new Set<string>();
  const clusters: ShuttleRun[][] = [];

  for (const run of runs) {
    if (visited.has(run.key)) continue;
    const group: ShuttleRun[] = [];
    const stack = [run];
    visited.add(run.key);
    while (stack.length) {
      const r = stack.pop()!;
      group.push(r);
      for (const o of runs) {
        if (visited.has(o.key)) continue;
        if (runsOverlapJourney(r, o, day, config)) {
          visited.add(o.key);
          stack.push(o);
        }
      }
    }
    clusters.push(group);
  }
  return clusters;
}

function layoutClusterColumns(
  cluster: ShuttleRun[],
  day: ShuttleDay,
  config: CoordinatorConfig
): Map<string, { col: number; cols: number }> {
  const sorted = [...cluster].sort(
    (a, b) =>
      a.startMinutes - b.startMinutes ||
      a.endMinutes - b.endMinutes ||
      a.runNumber - b.runNumber
  );
  const colEnds: number[] = [];
  const colMap = new Map<string, { col: number; cols: number }>();

  for (const r of sorted) {
    const j = computeRunTimelineJourney(r, day, config);
    const displayStart = j?.displayStart ?? r.startMinutes;
    const displayEnd = j?.displayEnd ?? r.endMinutes;
    let c = 0;
    while (c < colEnds.length && colEnds[c] > displayStart) c++;
    if (c === colEnds.length) colEnds.push(displayEnd);
    else colEnds[c] = Math.max(colEnds[c], displayEnd);
    colMap.set(r.key, { col: c, cols: 0 });
  }

  const total = colEnds.length;
  for (const key of colMap.keys()) {
    colMap.get(key)!.cols = total;
  }
  return colMap;
}

function computeRunLayouts(
  runs: ShuttleRun[],
  day: ShuttleDay,
  config: CoordinatorConfig
) {
  const map = new Map<string, { col: number; cols: number }>();
  for (const cluster of clusterRuns(runs, day, config)) {
    const m = layoutClusterColumns(cluster, day, config);
    for (const [k, v] of m) map.set(k, v);
  }
  return map;
}

function computeTimeWindow(
  runs: ShuttleRun[],
  day: ShuttleDay,
  config: CoordinatorConfig
) {
  if (runs.length === 0) {
    return { start: 6 * 60, end: 22 * 60 };
  }
  let start = Math.min(
    ...runs.map((r) => computeRunTimelineJourney(r, day, config)?.displayStart ?? r.startMinutes)
  );
  let end = Math.max(
    ...runs.map((r) => computeRunTimelineJourney(r, day, config)?.displayEnd ?? r.endMinutes)
  );
  start = Math.max(0, Math.floor(start / 60) * 60 - 60);
  end = Math.min(24 * 60, Math.ceil(end / 60) * 60 + 60);
  if (end - start < 120) {
    end = Math.min(24 * 60, start + 180);
  }
  return { start, end };
}

function gridTemplate(columns: number) {
  return {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  } as const;
}

function PlanningTimelineRunBlock({
  run,
  day,
  journey,
  layout,
  windowStart,
  runSlots,
  config,
  configVehicles,
  onRunActivate,
}: {
  run: ShuttleRun;
  day: ShuttleDay;
  journey: RunTimelineJourney | null;
  layout: { col: number; cols: number };
  windowStart: number;
  runSlots: Record<string, RunSlotState>;
  config: CoordinatorConfig;
  configVehicles: Vehicle[];
  onRunActivate?: (runKey: string) => void;
}) {
  const displayStart = journey?.displayStart ?? run.startMinutes;
  const displayEnd = journey?.displayEnd ?? run.endMinutes;
  const top = (displayStart - windowStart) * PX_PER_MINUTE;
  const spanMinutes = Math.max(displayEnd - displayStart, 1);
  const height = Math.max(
    spanMinutes * PX_PER_MINUTE,
    TIMELINE_RUN_BLOCK_MIN_HEIGHT_PX
  );
  const colW = 100 / layout.cols;
  const left = layout.col * colW;
  const slot = runSlots[run.key];
  const vehicleName = slot?.vehicleId
    ? configVehicles.find((v) => v.id === slot.vehicleId)?.name ?? "Vehicle"
    : null;
  const driver = slot?.driverName?.trim();

  const tip = journey
    ? `Run ${run.runNumber} (${formatWindow(run)}): open in list view`
    : `Run ${run.runNumber}: open in list view`;

  const detailHeader = (
    <TimelineRunDetailHeader
      run={run}
      day={day}
      config={config}
      vehicleName={vehicleName}
      driver={driver ?? null}
    />
  );

  return (
    <button
      type="button"
      onClick={() => onRunActivate?.(run.key)}
      title={tip}
      className="absolute z-0 flex min-h-0 flex-col overflow-hidden rounded-md border-2 border-white bg-primary p-0 text-left text-primary-foreground shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12),0_4px_16px_rgba(15,23,42,0.2)] transition hover:z-20 hover:brightness-95 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        top,
        height,
        left: `calc(${left}% + 2px)`,
        width: `calc(${colW}% - 4px)`,
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">{detailHeader}</div>
    </button>
  );
}

export function PlanningTimeline({
  runs,
  day,
  onRunActivate,
  className,
}: {
  runs: ShuttleRun[];
  day: ShuttleDay;
  onRunActivate?: (runKey: string) => void;
  className?: string;
}) {
  const { runSlots, config } = useShuttle();
  const traffic = config.timelineTraffic;
  const dayVehicles = useMemo(
    () => config.vehicles.filter((v) => v.shuttleDay === day),
    [config.vehicles, day]
  );

  const journeyByKey = useMemo(() => {
    const m = new Map<string, RunTimelineJourney | null>();
    for (const r of runs) {
      m.set(r.key, computeRunTimelineJourney(r, day, config));
    }
    return m;
  }, [runs, day, config]);

  const travel = config.travelTimeToHeathrowMinutes;
  const touchdownExit = config.touchdownToAirportExitMinutes ?? 30;
  const exitToMeet = config.inboundAirportExitWaitMinutes ?? 0;
  const handover = config.inboundHandoverBufferMinutes;

  const kindLine =
    day === "saturday"
      ? `Saturday: each leg uses base ${travel}m travel, scaled by peak (+${traffic.peakExtraPercent}%) or off-peak outside those windows (see Configuration)`
      : `Arrivals: drive legs use base ${travel}m with the same traffic scaling; vertical placement uses touchdown→exit, exit→meet, and load buffers from Configuration.`;

  const knownVehicleIds = useMemo(
    () => new Set(dayVehicles.map((v) => v.id)),
    [dayVehicles]
  );

  const columns = useMemo(
    () => buildTimelineColumns(dayVehicles, runs, runSlots),
    [dayVehicles, runs, runSlots]
  );

  const layoutsByColumn = useMemo(() => {
    const map = new Map<string, Map<string, { col: number; cols: number }>>();
    for (const col of columns) {
      const subset = runsInTimelineColumn(
        runs,
        col,
        runSlots,
        knownVehicleIds
      );
      map.set(col.id, computeRunLayouts(subset, day, config));
    }
    return map;
  }, [columns, runs, runSlots, knownVehicleIds, day, config]);

  const { windowStart, heightPx, hourTicks } = useMemo(() => {
    const { start, end } = computeTimeWindow(runs, day, config);
    const span = Math.max(end - start, 60);
    const ticks: number[] = [];
    for (let m = start; m <= end; m += 60) {
      ticks.push(m);
    }
    return {
      windowStart: start,
      heightPx: span * PX_PER_MINUTE,
      hourTicks: ticks,
    };
  }, [runs, day, config]);

  const tzShort = useMemo(() => {
    try {
      const fmt = new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" });
      const parts = fmt.formatToParts(new Date());
      const name = parts.find((p) => p.type === "timeZoneName")?.value;
      return name ?? "";
    } catch {
      return "";
    }
  }, []);

  if (runs.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No shuttle runs for this day with the current upload and rules.
      </p>
    );
  }

  const vehicleColumnCount = dayVehicles.length;
  const hasUnassignedColumn = columns.some((c) => c.kind === "unassigned");
  const isAllRunsFallback = columns.some((c) => c.kind === "all");

  return (
    <div className={cn("w-full min-w-0 space-y-2", className)}>
      <p className="text-muted-foreground text-xs">
        Scroll the grid to see the full day. {kindLine}.{" "}
        {tzShort ? <span className="font-medium text-foreground/80">{tzShort}</span> : null}
      </p>
      <p className="text-muted-foreground text-[0.7rem] leading-snug">
        {isAllRunsFallback ? (
          <>
            <span className="font-medium text-foreground/80">Columns:</span> add
            vehicles in Configuration to split the timeline by vehicle.
          </>
        ) : (
          <>
            <span className="font-medium text-foreground/80">Columns:</span> one
            per vehicle in Configuration ({vehicleColumnCount}
            {vehicleColumnCount === 1 ? " column" : " columns"}
            ).
            {hasUnassignedColumn ? (
              <>
                {" "}
                <span className="font-medium text-foreground/80">Unassigned</span>{" "}
                lists runs without a vehicle. Overlaps in a vehicle column suggest
                a clash.
              </>
            ) : (
              <> Overlaps in a vehicle column suggest a clash.</>
            )}
          </>
        )}
      </p>
      {day !== "saturday" ? (
        <p className="text-muted-foreground text-[0.7rem] leading-snug">
          <span className="font-medium text-foreground/80">Runs:</span> each block
          spans from journey start to estimated return on the clock. Click a block
          to scroll to it in the list below. Arrival buffers (
          {touchdownExit}m touchdown→exit + {exitToMeet}m exit→meet + {handover}m load)
          still feed vertical placement and the timeline height.
        </p>
      ) : (
        <p className="text-muted-foreground text-[0.7rem] leading-snug">
          <span className="font-medium text-foreground/80">Runs:</span> each block
          spans the run&apos;s pickup window through estimated return on the clock.
          Click a block to scroll to it in the list below. Peak travel (+
          {traffic.peakExtraPercent}%) follows Configuration windows.
        </p>
      )}
      <div className="max-h-[min(72vh,880px)] w-full min-w-0 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
        <div className="sticky top-0 z-10 flex w-full min-w-0 border-[#E5E7EB] border-b bg-[#F9FAFB]">
          <div className="w-14 shrink-0" aria-hidden />
          <div
            className="grid min-w-0 flex-1"
            style={gridTemplate(columns.length)}
          >
            {columns.map((col) => (
              <div
                key={col.id}
                className={cn(
                  "border-[#E5E7EB] border-l px-1 py-2 text-center font-semibold text-[#374151] text-xs leading-tight",
                  col.kind === "unassigned" && "bg-amber-50/80 text-amber-950",
                  col.kind === "all" && "bg-muted/60"
                )}
              >
                {col.label}
              </div>
            ))}
          </div>
        </div>
        <div className="flex w-full min-w-0">
          <div
            className="relative w-14 shrink-0 border-[#E5E7EB] border-r bg-[#F9FAFB] text-right font-medium text-[#6B7280] text-xs tabular-nums"
            style={{ height: heightPx }}
          >
            {hourTicks.map((m) => (
              <div
                key={m}
                className="absolute right-1.5 -translate-y-1/2"
                style={{ top: (m - windowStart) * PX_PER_MINUTE }}
              >
                {minutesToLabel(m)}
              </div>
            ))}
          </div>
          <div
            className="relative grid min-w-0 flex-1 bg-white"
            style={{ ...gridTemplate(columns.length), height: heightPx }}
          >
            {columns.map((col) => {
              const subset = runsInTimelineColumn(
                runs,
                col,
                runSlots,
                knownVehicleIds
              );
              const layouts =
                layoutsByColumn.get(col.id) ??
                new Map<string, { col: number; cols: number }>();
              return (
                <div
                  key={col.id}
                  className="relative min-w-0 border-[#E5E7EB] border-l"
                >
                  {hourTicks.map((m) => (
                    <div
                      key={`${col.id}-line-${m}`}
                      className="pointer-events-none absolute right-0 left-0 border-[#E5E7EB] border-t"
                      style={{ top: (m - windowStart) * PX_PER_MINUTE }}
                    />
                  ))}
                  {subset.map((run) => (
                    <PlanningTimelineRunBlock
                      key={run.key}
                      run={run}
                      day={day}
                      journey={journeyByKey.get(run.key) ?? null}
                      layout={layouts.get(run.key) ?? { col: 0, cols: 1 }}
                      windowStart={windowStart}
                      runSlots={runSlots}
                      config={config}
                      configVehicles={dayVehicles}
                      onRunActivate={onRunActivate}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
